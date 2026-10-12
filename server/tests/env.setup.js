/**
 * Vitest `setupFiles` entry. Runs before any test file is imported.
 *
 * This exists because of an import-order trap. `src/config/passport.js` calls
 * `dotenv.config()` and then constructs `new JwtStrategy({ secretOrKey:
 * process.env.JWT_ACCESS_SECRET })` at MODULE LOAD. `tests/setup.js` sets
 * `process.env.JWT_ACCESS_SECRET` inside `startTestServer()`, which runs from a
 * `beforeAll` hook — long after module evaluation. So the strategy was built
 * from `undefined` and passport-jwt threw before a single test ran.
 *
 * It only ever passed locally because `server/.env` is gitignored: on a
 * developer machine dotenv found the secret before passport.js loaded. CI has
 * no `.env`, so every run died with the same error. Moving the defaults here
 * fixes the ordering instead of relying on a file that is not in the repo.
 *
 * Deliberately imports nothing from `src/`. Any import here would re-trigger
 * the exact module load this file exists to precede.
 */
process.env.JWT_ACCESS_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_ORIGIN ||= 'http://localhost:5173';
// Tests exercise development boot paths; production guards are covered by
// tests/env.test.js rather than by the boot itself.
process.env.NODE_ENV ||= 'development';

// Lift the rate limiters for the test run. The suite logs in once per fixture
// user, so a full pass makes well over 100 login attempts from 127.0.0.1 — past
// the 100/15min login cap that applies whenever RATE_LIMIT_LOGIN is unset.
// Once tripped, `login` answers 429 with no `tokens`, and the helper passes
// `undefined` into `bearer()`, which then throws
// "Cannot read properties of undefined (reading 'accessToken')" in whatever test
// happens to run next. It never failed locally only because the gitignored
// `server/.env` pins RATE_LIMIT_LOGIN=1000 for local QA; CI has no `.env`, so CI
// ran with the default and payments.test.js failed.
//
// Nothing is lost: no test asserts throttling, and the production guard that
// rejects a login limit above 20 is covered by tests/env.test.js, which passes
// explicit objects to validateEnv() and so never reads these values. These use
// `||=` to stay overridable from the shell.
process.env.RATE_LIMIT_LOGIN ||= '10000';
process.env.RATE_LIMIT_AUTH ||= '100000';
process.env.RATE_LIMIT_API ||= '1000000';

// Never send real email from a test run. The suite registers many users, and
// each registration fires a verification email, so with SMTP configured on the
// developer's machine it mailed real addresses and then got throttled by
// Gmail ("454 Too many login attempts"), failing tests that had nothing to do
// with mail. CI never hit this because it has no `.env` at all — the same
// luck-not-design trap as above, in the opposite direction.
//
// Set to '' rather than deleted: `mailService.js` tests
// `SMTP_HOST && SMTP_USER`, so empty falls back to logging to the console. And
// `delete` would not work anyway — `dotenv.config()` backfills any key that is
// absent, and a key set to '' is already "present" so dotenv leaves it alone.
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.SMTP_FROM = '';
