import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
      // Must stay ahead of every test file. `src/config/passport.js` reads
      // JWT_ACCESS_SECRET at module load, so the value has to exist before any
      // import pulls the app in. See tests/env.setup.js for the full reason.
      setupFiles: ['tests/env.setup.js'],
    // Each suite boots its own in-memory mongod; give them room and run them
    // in a single fork so two mongod instances never contend for resources.
    testTimeout: 120000,
    hookTimeout: 180000,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
