import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Each suite boots its own in-memory mongod; give them room and run them
    // in a single fork so two mongod instances never contend for resources.
    testTimeout: 120000,
    hookTimeout: 180000,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
