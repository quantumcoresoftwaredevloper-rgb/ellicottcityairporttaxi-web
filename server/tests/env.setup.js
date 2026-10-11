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