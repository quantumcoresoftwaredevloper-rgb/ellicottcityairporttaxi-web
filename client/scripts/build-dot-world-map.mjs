#!/usr/bin/env node
/**
 * Generate a dotted world map for use as a CSS background layer.
 *
 * A gradient cannot draw continents, so the map is emitted as an SVG of
 * individual <circle> dots on an equirectangular grid. Only land cells get a
 * dot, which is what makes the continents readable.
 *
 * Emitted in a 1:1-ish viewBox (deg lon x deg lat) and consumed with
 * `preserveAspectRatio="xMidYMid slice"` so the circles stay CIRCULAR. A
 * `none` ratio stretches the viewBox to the band and turns every dot into an
 * ellipse, which is immediately visible at large sizes.
 *
 * The land is a hand-built set of lon/lat boxes, so the output carries no
 * third-party artwork. It is intentionally stylised: this is a background
 * texture, not a data graphic, and a survey coastline reads as noise at page
 * scale.
 *
 *   node scripts/build-dot-world-map.mjs
 *
 * Writes public/assets/dot-world-map.svg. Re-run after editing LAND_BOXES.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'assets', 'dot-world-map.svg');
const OUT_BAND = join(HERE, '..', 'public', 'assets', 'dot-world-map-band.svg');

// Ink is baked per variant, NOT `currentColor`. `color` is also the text
// colour, so a `text-white`/`text-ink` utility on the section would otherwise
// override the texture's ink and paint the dots solid.
const INK = 'rgba(28,29,33,0.06)';    // light surfaces
const INK_BAND = 'rgba(255,255,255,0.04)'; // blue bands

const LAT_TOP = 80;   // clip the poles
const LAT_BOT = -56;  // clip below the southern tip
const STEP_LON = 2.5; // dot pitch in degrees
const STEP_LAT = 2.5;
// Vertical breathing room, in map degrees. The land itself spans 136 rows; the
// viewBox is padded to 216 so a tall (1.6:1) hero crops only ~3% of the
// longitude under `background-size: cover` instead of ~40%.
const VB = '0 -40 360 216';
const DOT_R = 0.85;   // degrees — per-dot contrast is unchanged, total ink is higher

// lon0, lat0, lon1, lat1
const LAND_BOXES = [
  // --- North America ------------------------------------------------------
  [-168, 66, -140, 71], [-166, 60, -132, 68], [-140, 60, -124, 70],
  [-132, 54, -122, 60], [-128, 48, -124, 55], [-124, 40, -119, 48],
  [-124, 34, -117, 41], [-117, 32, -110, 37], [-110, 31, -103, 37],
  [-105, 22, -97, 32], [-97, 26, -94, 30], [-100, 17, -92, 22],
  [-97, 16, -88, 21], [-92, 15, -83, 19], [-88, 13, -84, 18],
  [-84, 9, -77, 15], [-83, 8, -77, 12], [-80, 8, -76, 11],
  [-95, 45, -88, 49], [-92, 43, -83, 47], [-85, 40, -79, 45],
  [-83, 44, -76, 47], [-79, 43, -76, 45], [-81, 52, -76, 56],
  [-82, 55, -64, 62], [-78, 58, -64, 66], [-95, 60, -82, 70],
  [-125, 70, -100, 72],
  // --- Greenland ----------------------------------------------------------
  [-58, 60, -42, 78], [-52, 78, -24, 82], [-45, 60, -22, 70],
  // --- Iceland ------------------------------------------------------------
  [-24, 63, -13, 67],
  // --- Central America ----------------------------------------------------
  [-95, 17, -88, 22], [-92, 15, -86, 19], [-89, 13, -83, 17],
  // --- Caribbean ----------------------------------------------------------
  [-80, 20, -74, 24], [-77, 18, -70, 22],
  // --- South America ------------------------------------------------------
  [-80, 6, -70, 12], [-78, 0, -70, 7], [-76, -4, -68, 2],
  [-76, -10, -68, -2], [-74, -18, -62, -8], [-73, -24, -63, -16],
  [-75, -34, -66, -24], [-74, -44, -67, -34], [-75, -52, -68, -44],
  [-70, -54, -65, -46], [-67, -45, -62, -38], [-65, -40, -57, -32],
  [-58, -34, -52, -26], [-57, -26, -50, -20], [-52, -24, -48, -18],
  [-70, -20, -60, -14], [-74, -16, -68, -10], [-78, -10, -72, -4],
  [-80, 2, -76, 6],
  // --- Europe -------------------------------------------------------------
  [-9, 36, 3, 44], [-9, 43, 4, 48], [-6, 48, 8, 55], [-6, 55, 10, 60],
  [-10, 58, 20, 66], [-24, 60, -8, 70], [5, 50, 12, 58], [8, 44, 18, 50],
  [18, 42, 28, 48], [12, 38, 19, 45], [26, 36, 40, 44], [28, 45, 40, 50],
  [20, 60, 30, 70], [30, 60, 60, 70],
  // --- British Isles ------------------------------------------------------
  [-8, 50, -2, 58], [-10, 58, -6, 58], [-6, 50, -1, 55],
  // --- Africa -------------------------------------------------------------
  [-17, 15, 8, 33], [-12, 5, 8, 15], [-4, 2, 12, 8], [8, 4, 20, 14],
  [8, 16, 24, 32], [20, 12, 34, 28], [28, 8, 43, 18], [24, -4, 34, 8],
  [20, -14, 32, 4], [25, -22, 33, -12], [18, -34, 30, -22], [28, -30, 35, -18],
  [-17, 12, 0, 28], [32, 0, 40, 12], [40, -6, 42, 2],
  // --- Madagascar / Sri Lanka --------------------------------------------
  [44, -16, 49, -25], [80, 6, 82, 9],
  // --- Middle East --------------------------------------------------------
  [34, 30, 48, 38], [36, 22, 48, 32], [44, 12, 60, 20], [52, 24, 62, 30],
  // --- Asia ---------------------------------------------------------------
  [58, 24, 74, 32], [60, 30, 80, 40], [68, 40, 90, 50], [76, 50, 100, 60],
  [90, 50, 120, 58], [100, 42, 120, 50], [96, 24, 110, 40], [104, 18, 116, 30],
  [108, 8, 118, 20], [96, 10, 108, 22], [70, 8, 92, 26], [62, 20, 76, 30],
  [80, 8, 90, 20], [112, 22, 126, 40], [122, 30, 136, 44], [130, 42, 142, 52],
  [136, 44, 145, 55], [60, 58, 90, 70], [90, 66, 130, 76], [60, 70, 110, 78],
  // --- Japan / Korea ------------------------------------------------------
  [130, 31, 136, 36], [139, 34, 145, 44], [141, 44, 146, 46],
  [126, 34, 129, 38],
  // --- SE Asia / Indonesia ------------------------------------------------
  [98, 4, 106, 20], [104, 1, 110, 10], [112, -4, 118, 2], [118, -6, 126, 1],
  [120, 12, 126, 20], [92, -5, 140, 4], [130, -3, 140, 2],
  // --- Philippines --------------------------------------------------------
  [119, 6, 126, 19],
  // --- Australia / NZ -----------------------------------------------------
  [113, -14, 122, -28], [124, -15, 130, -28], [130, -18, 137, -30],
  [137, -33, 141, -39], [129, -32, 135, -37], [166, -34, 176, -46],
  [172, -40, 178, -47], [166, -45, 172, -47],
];

const isLand = (lon, lat) =>
  LAND_BOXES.some(([x0, y0, x1, y1]) => lon >= x0 && lon <= x1 && lat >= y0 && lat <= y1);

const W = 360;
const H = LAT_TOP - LAT_BOT;
const dots = [];

for (let lat = LAT_TOP - STEP_LAT / 2; lat > LAT_BOT; lat -= STEP_LAT) {
  for (let lon = -180 + STEP_LON / 2; lon < 180; lon += STEP_LON) {
    if (!isLand(lon, lat)) continue;
    // equirectangular: x from west, y from north
    const x = (lon + 180).toFixed(2);
    const y = (LAT_TOP - lat).toFixed(2);
    dots.push(`<circle cx="${x}" cy="${y}" r="${DOT_R}"/>`);
  }
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
  `preserveAspectRatio="xMidYMid slice" fill="__INK__">${dots.join('')}</svg>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg.replace('__INK__', INK), 'utf8');
writeFileSync(OUT_BAND, svg.replace('__INK__', INK_BAND), 'utf8');

console.log(`wrote ${OUT}\nwrote ${OUT_BAND}`);
console.log(`  grid : ${(W / STEP_LON).toFixed(0)} x ${(H / STEP_LAT).toFixed(0)}`);
console.log(`  dots : ${dots.length}`);
console.log(`  size : ${(svg.length / 1024).toFixed(1)} KB`);
