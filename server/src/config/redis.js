import Redis from 'ioredis';

let client = null;
let available = false;
let connecting = null;

export const getRedis = () => client;
export const isRedisAvailable = () => available;

export const initRedis = async () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('Redis disabled — REDIS_URL not set (using in-memory rate limits)');
    return null;
  }
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      const redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
        // Never let a slow Redis hold the HTTP server hostage at boot.
        connectTimeout: 5000,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });
      redis.on('error', (e) => console.warn('Redis error:', e.message));

      // Race the connect against a hard deadline so a blackholed Redis degrades
      // to in-memory limits instead of hanging the deploy.
      await Promise.race([
        redis.connect().then(() => redis.ping()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('connect timeout')), 6000)),
      ]);

      client = redis;
      available = true;
      console.log('Redis ready — rate limits are shared across instances');
      return redis;
    } catch (e) {
      console.warn('Redis unavailable, falling back to in-memory rate limits:', e.message);
      try { client?.disconnect(); } catch { /* already closed */ }
      client = null;
      available = false;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
};

/**
 * A shared rate-limit store backed by Redis.
 *
 * The default express-rate-limit store keeps counters in process memory, so with
 * more than one instance a client gets a fresh allowance from every instance it
 * happens to reach. This store moves the counters to Redis so the limits the app
 * advertises are the limits actually enforced.
 *
 * Implements the express-rate-limit v7+/v8 store contract.
 */
export const redisRateLimitStore = () => {
  if (!client || !available) return undefined;

  let prefix = 'rl:';
  let windowMs = 15 * 60 * 1000;

  return {
    async init(options = {}) {
      if (options.prefix) prefix = options.prefix;
      if (options.windowMs) windowMs = options.windowMs;
    },

    async increment(key) {
      const redisKey = `${prefix}${key}`;
      const hits = await client.incr(redisKey);
      if (hits === 1) {
        await client.pexpire(redisKey, windowMs);
      }
      const ttlMs = await client.pttl(redisKey);
      const resetTime = new Date(Date.now() + (ttlMs > 0 ? ttlMs : windowMs));
      return { totalHits: hits, resetTime };
    },

    async decrement(key) {
      await client.decr(`${prefix}${key}`);
    },

    async resetKey(key) {
      await client.del(`${prefix}${key}`);
    },

    async onKeysRemoved(keys) {
      if (!keys?.length) return;
      await client.del(...keys.map((k) => `${prefix}${k}`));
    },
  };
};
