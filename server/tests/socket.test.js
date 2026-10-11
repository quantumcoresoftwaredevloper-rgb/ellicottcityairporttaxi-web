/**
 * Socket.io authorization and location isolation.
 *
 * `config/socket.js` is the only thing standing between a stranger and a live
 * passenger's coordinates, and until this file existed it had no coverage at
 * all. The reason is structural, not oversight: `tests/setup.js` drives the app
 * through supertest, which calls the Express handler directly and never opens a
 * socket, so no supertest-based test could reach this code. It needs a real
 * listening server plus a real client.
 *
 * The tests below do both. They are the guard on the regression AGENTS.md warns
 * about: trusting a client-asserted identity.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { io as ioClient } from 'socket.io-client';
import { server, app } from '../src/index.js';
import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';
import Ride from '../src/models/Ride.js';
import User from '../src/models/User.js';
import { ensureCatalogDefaults } from '../src/services/catalogService.js';

let mongod;
let baseURL;

beforeAll(async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET ||= 'socket-test-secret-that-is-32-chars-plus';
  process.env.CLIENT_ORIGIN ||= 'http://localhost:5173';
  await connectDB();
  await ensureCatalogDefaults();

  await new Promise((resolve) => server.listen(0, resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  // `server.close()` only stops new connections — it waits on the live ones, so
  // any socket still attached holds it open until the hook times out. `io.close()`
  // disconnects every client first, then closes the http server.
  const io = app.get('io');
  if (io) await new Promise((resolve) => io.close(resolve));
  else await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  await ensureCatalogDefaults();
});

/** Mint an access token directly, for users who cannot log in (suspended). */
const mintToken = async (user) => {
  const jwt = (await import('jsonwebtoken')).default;
  return jwt.sign(
    { id: String(user._id), role: user.role, v: user.tokenVersion ?? 0 },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

const makeUser = async (role, extra = {}) => {
  const user = await User.create({
    name: `${role} tester`,
    email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ellicot.com`,
    password: 'driver123',
    role,
    emailVerified: true,
    driverDetails: {
      vehicleType: 'executive-sedan',
      plateNumber: 'SOCK-1',
      licenseNo: 'DL-SOCK',
      isAvailable: true,
      verificationStatus: 'verified',
      ...(extra.driverDetails || {}),
    },
    ...extra,
  });
  const res = await supertest(app)
    .post('/api/auth/login').send({ identifier: user.email, password: 'driver123' });
  // A suspended user is refused at login by design, so sign a token instead.
  const token = res.body.tokens?.accessToken || (await mintToken(user));
  return { user, token };
};

const connect = (auth = {}, opts = {}) =>
  new Promise((resolve, reject) => {
    const s = ioClient(baseURL, { auth, transports: ['websocket'], ...opts });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('socket connect timed out')), 8000);
  });

/** Resolve on the next matching event, or time out. */
const once = (socket, event, ms = 3000) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedOut: true }), ms);
    socket.once(event, (payload) => { clearTimeout(t); resolve(payload); });
  });

// `String(doc._id)`, NOT `doc.toString()` — on a Mongoose document toString()
// returns an inspect string, which isObjectId rejects, so every ride:join was
// silently ignored. That is exactly the kind of thing this suite exists to catch.
const ride = async (passengerId, driverId = null, status = 'pending') =>
  String((await Ride.create({
    passenger: passengerId,
    driver: driverId,
    pickup: { address: 'A', lat: 39.2, lng: -76.8 },
    dropoff: { address: 'B', lat: 39.3, lng: -76.7 },
    vehicleType: 'executive-sedan',
    status,
    fare: { estimated: 40, final: status === 'completed' ? 45 : undefined, currency: 'USD' },
  }))._id);

const close = async (...sockets) => {
  for (const s of sockets) if (s) s.close();
};

describe('handshake', () => {
  it('connects anonymously with no token, joining nothing', async () => {
    const s = await connect({});
    expect(s.connected).toBe(true);
    // An anonymous socket must not be in any room. Proved indirectly: it cannot
    // publish or subscribe to ride traffic, covered below.
    await close(s);
  });

  it('rejects a garbage token', async () => {
    await expect(connect({ token: 'not-a-jwt' })).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('ignores a client-asserted userId and role', async () => {
    // The regression this file exists to prevent: accepting identity from the
    // handshake payload would let anyone claim the admins room.
    const s = await connect({ userId: '000000000000000000000000', role: 'admin' });
    expect(s.connected).toBe(true);
    // Same ride a real admin could read, but this socket never authenticated,
    // so ride:join must be a no-op.
    const { user } = await makeUser('passenger');
    const rideId = await ride(user._id.toString());
    s.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 300));
    // A client socket cannot read `rooms` (that is server-side state), so prove
    // non-membership by what it receives instead.
    const got = once(s, 'ride:driverFound', 800);
    s.emit('ride:join', { rideId });
    expect((await got).timedOut).toBe(true);
    await close(s);
  });

  it('accepts a valid token and resolves the role from the database', async () => {
    const { token } = await makeUser('driver');
    const s = await connect({ token });
    expect(s.connected).toBe(true);
    await close(s);
  });

  it('refuses a token for a suspended user', async () => {
    const { user, token } = await makeUser('passenger', { isSuspended: true });
    expect(user.isSuspended).toBe(true);
    await expect(connect({ token })).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('refuses a token whose tokenVersion has moved on (password reset)', async () => {
    const { user, token } = await makeUser('passenger');
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
    await expect(connect({ token })).rejects.toThrow(/UNAUTHORIZED/);
  });
});

describe('ride:join authorization', () => {
  it('lets the passenger join their own ride room', async () => {
    const p = await makeUser('passenger');
    const d = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'in_progress');

    const ps = await connect({ token: p.token });
    const ds = await connect({ token: d.token });
    ps.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const got = once(ps, 'driver:location', 2000);
    ds.emit('driver:location', { lat: 39.1, lng: -76.2 });
    const payload = await got;
    expect(payload.timedOut, 'passenger did not receive their own ride\'s location').toBeFalsy();
    expect(payload.lat).toBe(39.1);
    await close(ps, ds);
  });

  it('refuses a stranger', async () => {
    const owner = await makeUser('passenger');
    const rideId = await ride(owner.user._id.toString());
    const intruder = await makeUser('passenger');
    const s = await connect({ token: intruder.token });

    s.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const rideDoc = await Ride.findById(rideId).lean();
    expect(String(rideDoc.passenger)).toBe(String(owner.user._id));

    // The real proof: a driver on that ride publishes, and the intruder must
    // receive nothing.
    const driver = await makeUser('driver');
    await Ride.updateOne({ _id: rideId }, { driver: driver.user._id, status: 'in_progress' });

    const got = once(s, 'driver:location', 1500);
    const ds = await connect({ token: driver.token });
    ds.emit('driver:location', { lat: 39.25, lng: -76.75 });
    const payload = await got;
    expect(payload.timedOut, 'strangler received live location data').toBe(true);

    await close(s, ds);
  });

  it('lets the assigned driver join, and a different driver cannot', async () => {
    const p = await makeUser('passenger');
    const assigned = await makeUser('driver');
    const other = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), assigned.user._id, 'in_progress');

    const a = await connect({ token: assigned.token });
    const o = await connect({ token: other.token });
    a.emit('ride:join', { rideId });
    o.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 500));

    const heard = once(o, 'driver:location', 1500);
    a.emit('driver:location', { lat: 1, lng: 2 });
    const payload = await heard;
    expect(payload.timedOut, 'a non-assigned driver received location').toBe(true);

    await close(a, o);
  });

  it('lets staff join', async () => {
    const p = await makeUser('passenger');
    const rideId = await ride(p.user._id.toString(), null, 'in_progress');
    const admin = await makeUser('admin');

    const a = await connect({ token: admin.token });
    a.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const got = once(a, 'driver:location', 2000);
    const d = await makeUser('driver');
    await Ride.updateOne({ _id: rideId }, { driver: d.user._id });
    const ds = await connect({ token: d.token });
    ds.emit('driver:location', { lat: 5, lng: 6 });

    const payload = await got;
    expect(payload.timedOut).toBeFalsy();
    expect(payload.lat).toBe(5);
    await close(a, ds);
  });

  it('ignores a malformed ride id instead of crashing', async () => {
    const { token } = await makeUser('passenger');
    const s = await connect({ token });
    for (const bad of [null, '', 'abc', {}, { $ne: null }, 123]) {
      s.emit('ride:join', bad && bad.rideId !== undefined ? bad : { rideId: bad });
    }
    s.emit('ride:join', { rideId: '../../etc/passwd' });
    await new Promise((r) => setTimeout(r, 500));
    expect(s.connected).toBe(true);
    await close(s);
  });
});

describe('location routing', () => {
  it('driver:location reaches the ride room and nothing else', async () => {
    const p = await makeUser('passenger');
    const d = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'in_progress');

    const passenger = await connect({ token: p.token });
    const bystander = await connect({ token: (await makeUser('passenger')).token });
    const driver = await connect({ token: d.token });

    passenger.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const hears = once(passenger, 'driver:location', 2000);
    const spy = once(bystander, 'driver:location', 1500);
    driver.emit('driver:location', { lat: 39.9, lng: -76.1, heading: 90, speed: 12 });

    const p1 = await hears;
    expect(p1.timedOut).toBeFalsy();
    expect(p1.lat).toBe(39.9);
    expect(p1.lng).toBe(-76.1);
    expect(p1.heading).toBe(90);

    const b1 = await spy;
    expect(b1.timedOut, 'bystander received a location update').toBe(true);

    await close(passenger, bystander, driver);
  });

  it('a driver with no active ride broadcasts nothing', async () => {
    const d = await makeUser('driver');
    const p = await makeUser('passenger');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'completed');
    const passenger = await connect({ token: p.token });
    passenger.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 300));

    const driver = await connect({ token: d.token });
    const got = once(passenger, 'driver:location', 1500);
    driver.emit('driver:location', { lat: 1, lng: 1 });
    const payload = await got;
    expect(payload.timedOut, 'completed ride still streamed location').toBe(true);

    await close(passenger, driver);
  });

  it('rejects non-numeric coordinates', async () => {
    const p = await makeUser('passenger');
    const d = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'in_progress');
    const passenger = await connect({ token: p.token });
    passenger.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 300));

    const driver = await connect({ token: d.token });
    const got = once(passenger, 'driver:location', 1200);
    for (const bad of [{ lat: 'abc', lng: 1 }, { lat: NaN, lng: 1 }, { lat: 1 }, { lat: null, lng: null }]) {
      driver.emit('driver:location', bad);
    }
    const payload = await got;
    expect(payload.timedOut, 'garbage coordinates were broadcast').toBe(true);
    await close(passenger, driver);
  });

  it('passenger:location reaches the assigned driver only', async () => {
    const p = await makeUser('passenger');
    const d = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'in_progress');

    const driver = await connect({ token: d.token });
    const other = await connect({ token: (await makeUser('driver')).token });
    const passenger = await connect({ token: p.token });
    driver.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const hears = once(driver, 'passenger:location', 2000);
    const spy = once(other, 'passenger:location', 1500);
    passenger.emit('passenger:location', { lat: 39.7, lng: -76.2 });

    const d1 = await hears;
    expect(d1.timedOut).toBeFalsy();
    expect(d1.lat).toBe(39.7);
    expect((await spy).timedOut, 'unassigned driver received passenger location').toBe(true);

    await close(driver, other, passenger);
  });
});

describe('ride chat', () => {
  it('delivers between participants and persists', async () => {
    const p = await makeUser('passenger');
    const d = await makeUser('driver');
    const rideId = await ride(p.user._id.toString(), d.user._id, 'in_progress');
    const ps = await connect({ token: p.token });
    const ds = await connect({ token: d.token });
    ps.emit('ride:join', { rideId });
    ds.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const got = once(ds, 'ride:message', 2000);
    ps.emit('ride:message', { rideId, text: '  I am by the departures door  ' });
    const payload = await got;

    expect(payload.timedOut).toBeFalsy();
    expect(payload.text).toBe('I am by the departures door'); // trimmed
    expect(String(payload.sender)).toBe(String(p.user._id));

    const doc = await Ride.findById(rideId).lean();
    expect(doc.messages).toHaveLength(1);
    expect(doc.messages[0].text).toBe('I am by the departures door');
    await close(ps, ds);
  });

  it('a stranger cannot post or read chat', async () => {
    const p = await makeUser('passenger');
    const rideId = await ride(p.user._id.toString(), null, 'in_progress');
    const ps = await connect({ token: p.token });
    ps.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 400));

    const stranger = await makeUser('passenger');
    const ss = await connect({ token: stranger.token });

    const spy = once(ss, 'ride:message', 1500);
    ps.emit('ride:message', { rideId, text: 'secret location details' });
    expect((await spy).timedOut, 'stranger received chat').toBe(true);

    // And a write attempt from outside the ride is not persisted. The passenger's
    // own message IS legitimate and must survive, so assert on content rather
    // than on the total count.
    ss.emit('ride:message', { rideId, text: 'injected' });
    await new Promise((r) => setTimeout(r, 500));
    const doc = await Ride.findById(rideId).lean();
    const texts = (doc.messages ?? []).map((m) => m.text);
    expect(texts).not.toContain('injected');
    expect(texts).toContain('secret location details');

    await close(ps, ss);
  });

  it('trims a message to 500 characters', async () => {
    const p = await makeUser('passenger');
    const rideId = await ride(p.user._id.toString(), null, 'in_progress');
    const ps = await connect({ token: p.token });
    ps.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 300));

    ps.emit('ride:message', { rideId, text: 'x'.repeat(900) });
    await new Promise((r) => setTimeout(r, 500));
    const doc = await Ride.findById(rideId).lean();
    expect(doc.messages[0].text).toHaveLength(500);
    await close(ps);
  });
});

describe('re-authentication', () => {
  it('leaves the previous identity\'s rooms when the token changes', async () => {
    const first = await makeUser('driver');
    const second = await makeUser('driver');
    const s = await connect({ token: first.token });

    // Switch identity mid-connection.
    s.emit('authenticate', { token: second.token });
    await new Promise((r) => setTimeout(r, 500));

    // The new identity can join its own ride; the old one cannot.
    const rideFirst = await ride((await makeUser('passenger')).user._id.toString(), first.user._id, 'in_progress');
    const rideSecond = await ride((await makeUser('passenger')).user._id.toString(), second.user._id, 'in_progress');

    const heardOld = once(s, 'driver:location', 1200);
    s.emit('ride:join', { rideId: rideFirst });
    await new Promise((r) => setTimeout(r, 300));
    expect((await heardOld).timedOut).toBe(true);

    await close(s);
  });

  it('refuses to re-authenticate with a garbage token and keeps the old identity', async () => {
    const { user, token } = await makeUser('driver');
    const s = await connect({ token });
    s.emit('authenticate', { token: 'garbage' });
    await new Promise((r) => setTimeout(r, 400));
    // Still the original identity, so its own ride room still works.
    const rideId = await ride((await makeUser('passenger')).user._id.toString(), user._id, 'in_progress');
    s.emit('ride:join', { rideId });
    await new Promise((r) => setTimeout(r, 300));
    expect(s.connected).toBe(true);
    await close(s);
  });
});