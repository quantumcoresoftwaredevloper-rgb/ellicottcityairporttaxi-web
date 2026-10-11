/**
 * Request-body allowlisting helpers.
 *
 * Spreading `req.body` into a Mongoose create/update lets a client set any
 * field on the document — including privileged ones (role, tokenVersion,
 * assignedDriver, plateNumber). Every write path should name the fields it
 * accepts instead.
 */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Keeps only the allowlisted keys, dropping undefined/empty values. */
export const pick = (body, keys) => {
  const out = {};
  if (!isPlainObject(body)) return out;
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) out[key] = body[key];
  }
  return out;
};

/** Trims and length-caps every string field so a client can't store a novel. */
export const cleanStrings = (obj, maxLen = 500) => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') obj[k] = v.trim().slice(0, maxLen);
  }
  return obj;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A user-supplied pattern for Mongo. Escaping stops both invalid-regex 500s and
 * catastrophic backtracking, and the length cap bounds the work.
 */
export const safeRegex = (str, maxLen = 60) => new RegExp(escapeRegex(String(str).slice(0, maxLen)), 'i');

/**
 * Coerces a query-string filter to a primitive. Express parses `?status[$ne]=x`
 * into an object, which Mongo would execute as an operator.
 */
export const safeFilterValue = (value) => {
  if (typeof value === 'string') return value.slice(0, 64);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return undefined;
};

/** Coerces a pagination param to a bounded integer. */
export const safeInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};
