#!/usr/bin/env node
/**
 * Critical-path bundle gate.
 *
 * Reads the BUILT `dist/index.html` and fails if the page asks the browser to
 * download something it should not have to before it can render.
 *
 * This has to run against a real build, not the dev server. Vite's dev server
 * serves modules one at a time and emits neither `manualChunks` nor
 * `modulepreload`, so an e2e test cannot see this class of regression at all —
 * an e2e guard written for it passed with the bug reintroduced. Only the
 * bundled artefact carries the answer, so that is what gets inspected.
 *
 * The regression this guards: naming `three` in `rollupOptions.output.manualChunks`
 * made Vite emit
 *
 *     <link rel="modulepreload" href="/assets/three-*.js">
 *
 * into index.html, which put ~875 KB on the critical path of every page —
 * including phones, where the 3D hero is hidden below 768px and never renders.
 * It silently defeated the `lazy(() => import(...))` in pages/marketing/Home.jsx.
 * Measured: initial JS 1234 KB -> 360 KB when the entry was removed.
 *
 * Run: npm run check:bundle   (CI runs this in the `gates` job, after build)
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const htmlPath = join(dist, 'index.html');

if (!existsSync(htmlPath)) {
  console.error('\n  check:bundle: dist/index.html not found — run `npm run build` first.\n');
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');

const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const entryScripts = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]);
const initial = [...new Set([...preloaded, ...entryScripts])];

// --- 1. the 3D bundle must not be on the critical path ---------------------
const HEAVY = /three-|HeroTaxiScene|\.glb$/i;
const offenders = preloaded.filter((h) => HEAVY.test(h));

console.log('\n=== INITIAL JAVASCRIPT (fetched before first paint) ===');
let bytes = 0;
for (const src of initial) {
  const clean = src.split('?')[0];
  const file = join(dist, clean.replace(/^\//, ''));
  const size = existsSync(file) ? statSync(file).size : 0;
  bytes += size;
  console.log(`  ${clean.padEnd(38)}${(size / 1024).toFixed(0).padStart(6)} KB`);
}
console.log(`  ${'TOTAL (uncompressed)'.padEnd(38)}${(bytes / 1024).toFixed(0).padStart(6)} KB`);

if (offenders.length) {
  console.error('\n  ✗ FAIL — the 3D bundle is preloaded on every page load:');
  offenders.forEach((o) => console.error(`      ${o}`));
  console.error(
    '\n    Naming three in vite.config.js `manualChunks` causes this. It defeats the\n' +
      '    lazy() import in Home.jsx and puts ~875 KB in front of users who will\n' +
      '    never see the 3D scene. Rollup already splits it at the dynamic import.\n'
  );
  process.exit(1);
}

// --- 2. a budget, so a future regression is caught before it is this bad ----
const BUDGET_KB = 500;
const actual = bytes / 1024;
if (actual > BUDGET_KB) {
  console.error(`\n  ✗ FAIL — initial JS is ${actual.toFixed(0)} KB, over the ${BUDGET_KB} KB budget.`);
  console.error('    Something heavy moved into the entry chunk. Lazy-load it instead.\n');
  process.exit(1);
}

console.log(`\n  ok    no 3D bundle on the critical path`);
console.log(`  ok    initial JS ${actual.toFixed(0)} KB is within the ${BUDGET_KB} KB budget`);
console.log('\nCRITICAL PATH CLEAN\n');