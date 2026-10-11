/**
 * Fails fast at boot when a production deployment is missing critical config or
 * is still using placeholder secrets. Running with a weak JWT secret lets anyone
 * mint an admin token, so this is a hard stop rather than a warning.
 */

// Unmistakable "someone forgot to set this" markers. Matched as substrings of
// the normalised value so `change-me-access-secret` is caught, while a real
// random secret that merely starts with similar letters is not.
const PLACEHOLDER_TOKENS = [
  'changeme', 'change-me', 'change_me', 'your-secret', 'your_secret', 'yoursecret',
  'replaceme', 'replace-me', 'replace_me', 'placeholder', 'example-secret',
  'secretsecret', 'dummytoken', 'dummy-secret', 'notasecret', 'topsecret',
];

const isWeakSecret = (value) => {
  if (typeof value !== 'string') return true;
  const v = value.trim();
  // Short secrets are brute-forceable regardless of their content.
  if (v.length < 32) return true;
  const norm = v.toLowerCase();
  return PLACEHOLDER_TOKENS.some((token) => norm.includes(token));
};

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]} human-readable problems (empty when healthy)
 */
export const validateEnv = (env = process.env) => {
  const problems = [];
  const isProd = env.NODE_ENV === 'production';

  if (!env.MONGO_URI) {
    problems.push('MONGO_URI is required');
  } else if (isProd && env.MONGO_URI.includes('127.0.0.1') && !env.MONGO_URI.includes('localhost')) {
    problems.push('MONGO_URI still points at localhost in production');
  }

  if (!env.JWT_ACCESS_SECRET) {
    problems.push('JWT_ACCESS_SECRET is required');
  } else if (isProd && isWeakSecret(env.JWT_ACCESS_SECRET)) {
    problems.push('JWT_ACCESS_SECRET is a placeholder or shorter than 32 chars');
  }

  if (isProd && env.EXPOSE_DEV_TOKENS === 'true') {
    problems.push('EXPOSE_DEV_TOKENS must be false (unset) in production — it returns password-reset tokens in API responses');
  }

  if (isProd && env.CLIENT_ORIGIN === '*') {
    problems.push('CLIENT_ORIGIN must be a specific origin, not *');
  }

  if (String(env.CORS_ORIGINS || '').split(',').some((o) => o.trim() === '*')) {
    problems.push('CORS_ORIGINS must list specific origins, not *');
  }

  // Rate limits that have been raised for local testing must not ship.
  if (isProd) {
    const login = Number(env.RATE_LIMIT_LOGIN);
    if (Number.isFinite(login) && login > 20) {
      problems.push(`RATE_LIMIT_LOGIN=${login} is effectively disabled for production`);
    }
  }

  return problems;
};

/** Prints problems and exits(1) when the environment is unsafe for production. */
export const assertEnv = (env = process.env) => {
  const problems = validateEnv(env);
  if (!problems.length) return;
  console.error('\nRefusing to start — unsafe environment configuration:');
  for (const p of problems) console.error(`  • ${p}`);
  if (env.NODE_ENV === 'production') {
    console.error('\nSee server/.env.example for the expected values.\n');
    process.exit(1);
  }
  console.warn('(non-production: continuing with warnings)\n');
};

/**
 * Origins allowed to call the API over CORS.
 *
 * `CLIENT_ORIGIN` stays a SINGLE origin because it is also the base URL for the
 * verification/reset links in outgoing email — turning it into a list would
 * produce broken links. `CORS_ORIGINS` is the separate, CORS-only allowlist for
 * any additional trusted frontends (staging deploys, preview builds).
 *
 * The Capacitor origins are always admitted: they are constants of the native
 * shell (iOS serves from `capacitor://localhost`, Android from
 * `http://localhost`) and cannot be chosen by an attacker. Allowing them is safe
 * even though the API is credentialed, because auth is a Bearer token held in
 * localStorage rather than an ambient cookie — a hostile page on localhost still
 * has no token to send, and CORS is not an authentication mechanism.
 */
const NATIVE_APP_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];

/**
 * `localhost` and `127.0.0.1` are different origins to a browser, so a dev
 * allowlisting only one of them produces silent, confusing CORS failures
 * depending on how the URL was typed. Outside production, expand each loopback
 * origin to both spellings. Production is left untouched: the deployed list is
 * exact-match only.
 */
const loopbackTwins = (origin) => {
  if (origin.startsWith('http://localhost')) {
    return [origin, origin.replace('http://localhost', 'http://127.0.0.1')];
  }
  if (origin.startsWith('http://127.0.0.1')) {
    return [origin, origin.replace('http://127.0.0.1', 'http://localhost')];
  }
  return [origin];
};

export const corsOrigins = (env = process.env) => {
  const configured = [
    ...String(env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
    ...String(env.CORS_ORIGINS || '').split(','),
  ]
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');

  const isProd = String(env.NODE_ENV) === 'production';
  const expanded = isProd
    ? configured
    : configured.flatMap(loopbackTwins);

  return [...new Set([...expanded, ...NATIVE_APP_ORIGINS])];
};
