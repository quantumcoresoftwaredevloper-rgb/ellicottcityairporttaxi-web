/**
 * Fail if the client's offline fleet fallback drifts from the server's
 * FLEET_DEFAULTS.
 *
 * The fallback in src/data/vehicles.js is what renders whenever
 * `GET /api/fleet` is slow or unreachable — which is the normal case on a
 * deployed site that has not set VITE_API_URL, because the client then calls
 * /api on its own origin. It has silently drifted twice already, both times
 * only visible in production:
 *
 *   seats: 4 + image: ''  -> no vehicle photos, and a Van claiming 4 seats
 *   tagline: '' + features: [] -> every description and feature list gone
 *
 * A hand-copied list cannot be trusted, so this diffs them field by field.
 * `fare` is excluded on purpose: per-class pricing is deliberately not public.
 *
 * Run: npm run check:catalog
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(HERE, '../../server/src/services/catalogService.js');
const CLIENT_FLEET = resolve(HERE, '../src/data/vehicles.js');
const CLIENT_SERVICES = resolve(HERE, '../src/data/services.js');

/**
 * Pull a named `export const X = [ ... ];` array literal out of a module.
 *
 * `stubs` supplies bindings the literal references but the check does not care
 * about — the client file stores lucide icon components in its `icon` field
 * while the server stores an icon NAME string, so the client icons are stubbed
 * as plain markers and `icon` is excluded from the diff.
 */
function readArray(file, name, stubs = {}) {
  const src = readFileSync(file, 'utf8');
  const at = src.indexOf(`export const ${name} = [`);
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const start = src.indexOf('[', at);
  let depth = 0;
  let i = start;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  // The literals are plain data, so evaluating just the array is safe here and
  // avoids depending on the server module (which would pull in mongoose).
  const keys = Object.keys(stubs);
  // eslint-disable-next-line no-new-func
  return new Function(...keys, `return ${src.slice(start, i + 1)}`)(...keys.map((k) => stubs[k]));
}

const server = readArray(SERVER, 'FLEET_DEFAULTS');
const client = readArray(CLIENT_FLEET, 'VEHICLES', {
  Car: 'Car', CarFront: 'CarFront', Bus: 'Bus', Gem: 'Gem', School: 'School',
});

const serverServices = readArray(SERVER, 'SERVICE_DEFAULTS');
const clientServices = readArray(CLIENT_SERVICES, 'SERVICES');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
};

console.log('=== CLIENT FALLBACK vs SERVER FLEET_DEFAULTS ===');

const byKey = new Map(client.map((v) => [v.id, v]));
for (const s of server) {
  const c = byKey.get(s.key);
  if (!c) {
    fail(`${s.key}: missing from the client fallback`);
    continue;
  }
  for (const field of ['label', 'desc', 'capacity', 'seats', 'bags', 'image', 'tagline']) {
    if (c[field] !== s[field]) {
      fail(`${s.key}.${field}: client ${JSON.stringify(c[field])} != server ${JSON.stringify(s[field])}`);
    }
  }
  if (JSON.stringify(c.features) !== JSON.stringify(s.features)) {
    fail(
      `${s.key}.features: client ${JSON.stringify(c.features)} != server ${JSON.stringify(s.features)}`
    );
  }
}
for (const c of client) {
  if (!server.some((s) => s.key === c.id)) fail(`${c.id}: not in the server defaults`);
}

console.log(
  `  ok    ${server.length} classes: label/desc/capacity/seats/bags/image/tagline/features`
);

console.log('\n=== CLIENT FALLBACK vs SERVER SERVICE_DEFAULTS ===');
const bySlug = new Map(clientServices.map((s) => [s.slug, s]));
for (const s of serverServices) {
  const c = bySlug.get(s.slug);
  if (!c) {
    fail(`${s.slug}: missing from the client fallback`);
    continue;
  }
  for (const field of ['name', 'short', 'icon', 'tagline', 'summary']) {
    if (c[field] !== s[field]) {
      fail(`${s.slug}.${field}: client ${JSON.stringify(c[field])} != server ${JSON.stringify(s[field])}`);
    }
  }
  // The server omits `featured` on non-featured offerings (so it reads as
  // undefined, and the Mongoose default is false) while the client states it
  // explicitly. Same meaning, so compare as booleans rather than strictly.
  if (Boolean(c.featured) !== Boolean(s.featured)) {
    fail(`${s.slug}.featured: client ${c.featured} != server ${s.featured}`);
  }
  if (JSON.stringify(c.features) !== JSON.stringify(s.features)) {
    fail(
      `${s.slug}.features: client ${JSON.stringify(c.features)} != server ${JSON.stringify(s.features)}`
    );
  }
}
for (const c of clientServices) {
  if (!serverServices.some((s) => s.slug === c.slug)) fail(`${c.slug}: not in the server defaults`);
}

const featured = clientServices.filter((s) => s.featured).length;
console.log(`  ok    ${serverServices.length} offerings: name/short/icon/tagline/summary/featured/features`);
console.log(`  ok    ${featured} featured (drives the Home band)`);

const ok = failures === 0;
console.log(ok ? '\nFALLBACK MATCHES THE SERVER' : `\n${failures} DRIFTED FIELD(S)`);
process.exit(ok ? 0 : 1);
