/**
 * Contrast guard for the design tokens in `src/index.css`.
 *
 * LEAD = charcoal, ACCENT = orange, and red survives ONLY as `signal-*` for
 * things that mean live/active/failed. The theme's raw hexes are not usable as
 * text (Cargo's #00D084 is 1.9:1 on a light tint, #FF6900 is 2.89:1 on white),
 * so every role here is the lightest value that still clears its bar.
 *
 * Run: npm run check:contrast   (exits non-zero on any regression)
 */

const T = {
  // brand = MAJOR: Cargo blue #0B60A9, deep #084274 for bands
  brand: {
    50: '#f2f7fc', 100: '#e3eef8', 200: '#c2d9ec', 300: '#8fbcdd', 400: '#2f87bd',
    500: '#0b6ba8', 600: '#0b60a9', 700: '#08487e', 800: '#084274', 900: '#063050', 950: '#04203a',
  },
  // signal = the only red: live ride, failed payment, map pins, route
  signal: {
    50: '#fdeeee', 100: '#fbdada', 200: '#f5b3b3', 300: '#ee8a8a', 400: '#e05050',
    500: '#d62f2f', 600: '#c22020', 700: '#a81c1c', 800: '#8a1a1a', 900: '#6b1515', 950: '#451010',
  },
  accent: {
    50: '#f5f5f5', 100: '#ededed', 200: '#cccccc', 300: '#b4b4b4', 400: '#999999',
    500: '#6b6b6b', 600: '#5b5b5b', 700: '#444444', 800: '#313131', 900: '#1a1d21',
  },
  // gold token name is legacy; values are Cargo's light blue accent ramp
  gold: {
    50: '#eef5fc', 100: '#dceaf8', 200: '#bcd7f0', 300: '#8fbcdd', 400: '#a5cce6',
    500: '#3d8fc9', 600: '#0b6ba8', 700: '#08487e', 800: '#063a5e', 900: '#04263f', 950: '#021829',
  },
  success: {
    50: '#e6fbf3', 100: '#c2f5e1', 200: '#86eac5', 300: '#4ddca8', 400: '#1fd08e',
    500: '#00d084', 600: '#008252', 700: '#006b43', 800: '#045233', 900: '#032b21', 950: '#01170f',
  },
  surface: '#ffffff',
  ink: '#333333',
  muted: '#61656b',   // darkened to give the dotted texture room to breathe
  paper: '#f2f2f2',   // light neutral; Cargo's #EDEDED is the section band (accent-100)
};

// Dark mode overrides live in the `html.dark` block in index.css.
const DARK = {
  surface: '#2f2f2f',
  paper: '#1a1a1a',
  ink: '#f7f7f8',
  muted: '#9a9aa2',
  'brand-800': '#0e5189',
  'brand-900': '#0a3f6b',
  'brand-950': '#07304f',
};

const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

const luminance = (rgb) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(hex(a)), luminance(hex(b))].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};

// A dotted surface is the surface with the darkest dot pixel painted on it:
// --dot-color is ink at 6%, so bg becomes ink*0.06 + surface*0.94.
const DOT_ALPHA = 0.06;
const COMPOSITES = {
  'dot-paper': '#f2f2f2',   // light surfaces: ink at 6%
  'dot-soft': '#eef0f2',
  'dot-white': '#ffffff',
  'dot-band': '#084274',    // blue bands: white at 4% lightens instead
};

const DOT_BAND_ALPHA = 0.04;
const dotSurface = (name) => {
  const s = hex(COMPOSITES[name]);
  const c = name === 'dot-band' ? hex('#ffffff') : hex(T.ink);
  const a = name === 'dot-band' ? DOT_BAND_ALPHA : DOT_ALPHA;
  return `#${s.map((v, k) => Math.round(c[k] * a + v * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
};

const get = (name, mode) => {
  if (COMPOSITES[name]) return dotSurface(name);
  const [scale, step] = name.split('-');
  if (step && T[scale]) return T[scale][step];
  if (mode === 'dark' && DARK[name]) return DARK[name];
  if (T[name]) return T[name];
  throw new Error(`Unknown token: ${name}`);
};

// Composite a translucent white foreground over its backdrop.
const composite = (alpha, bg) => {
  const w = hex('#ffffff');
  const b = hex(bg);
  return `#${b.map((v, i) => Math.round(w[i] * alpha + v * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
};

// [label, foreground, background, minimum]
const LIGHT = [
  // --- the charcoal band (nav / hero / footer) ---
  ['white on brand-800 (band start)', '#ffffff', 'brand-800', 4.5],
  ['white on brand-900 (band mid)', '#ffffff', 'brand-900', 4.5],
  ['white on brand-950 (band deep)', '#ffffff', 'brand-950', 4.5],
  ['gold-300 accent word on band', 'gold-300', 'brand-800', 4.5],
  ['gold-300 on brand-900', 'gold-300', 'brand-900', 4.5],
  ['gold-300 on brand-950', 'gold-300', 'brand-950', 4.5],
  ['gold-400 live dot on band (graphic)', 'gold-400', 'brand-800', 3],

  // --- the orange CTA (sits ON the band, so white text must clear 4.5) ---
  ['white on gold-600 (CTA gradient start)', '#ffffff', 'gold-600', 4.5],
  ['white on gold-800 (CTA gradient end)', '#ffffff', 'gold-800', 4.5],
  ['white on gold-700 (CTA hover)', '#ffffff', 'gold-700', 4.5],

  // --- charcoal on light surfaces ---
  ['brand-700 link on surface', 'brand-700', 'surface', 4.5],
  ['brand-600 text on surface', 'brand-600', 'surface', 4.5],
  ['brand-800 chip label on surface', 'brand-800', 'surface', 4.5],
  ['brand-500 on paper', 'brand-500', 'paper', 4.5],
  ['brand-700 blue link on surface', 'brand-700', 'surface', 4.5],
  ['brand-600 blue link on surface', 'brand-600', 'surface', 4.5],
  ['brand-500 blue on paper', 'brand-500', 'paper', 4.5],
  ['brand-700 blue on brand-50 (chip)', 'brand-700', 'brand-50', 4.5],
  ['white on brand-600 (solid blue button)', '#ffffff', 'brand-600', 4.5],
  ['white on brand-700 (deep blue button)', '#ffffff', 'brand-700', 4.5],
  ['brand-500 focus ring on surface (non-text)', 'brand-500', 'surface', 3],
  ['brand-700 on paper', 'brand-700', 'paper', 4.5],
  ['ink body on paper', 'ink', 'paper', 4.5],
  ['ink body on surface', 'ink', 'surface', 4.5],
  ['muted secondary on paper', 'muted', 'paper', 4.5],
  ['muted secondary on surface', 'muted', 'surface', 4.5],
  ['accent-500 on paper', 'accent-500', 'paper', 4.5],
  ['accent-700 heading on paper', 'accent-700', 'paper', 4.5],
  ['brand-200 card border on surface (non-text)', 'brand-200', 'surface', 1.3],
  ['brand-500 focus ring on surface (non-text)', 'brand-500', 'surface', 3],

  // --- orange accent text on light ---
  ['gold-600 stat/accent text on surface', 'gold-600', 'surface', 4.5],
  ['gold-700 on gold-50 chip', 'gold-700', 'gold-50', 4.5],
  ['gold-700 on gold-100 chip', 'gold-700', 'gold-100', 4.5],

  // --- the signal red (semantic only) ---
  ['signal-700 on signal-50 (in-progress pill)', 'signal-700', 'signal-50', 4.5],
  ['signal-700 on signal-50 (failed payment pill)', 'signal-700', 'signal-50', 4.5],
  ['signal-500 on surface (failed dot, graphic)', 'signal-500', 'surface', 3],
  ['white on signal-600 (map pin glyph)', '#ffffff', 'signal-600', 4.5],
  ['white on signal-700 (dropoff pin glyph)', '#ffffff', 'signal-700', 4.5],

  // --- success ---
  ['success-600 on success-50 (status pill)', 'success-600', 'success-50', 4.5],
  ['success-700 on success-100', 'success-700', 'success-100', 4.5],

  // --- over the dotted texture (.bg-dots / .bg-dots-soft) ------------------
  // Worst case is the darkest pixel of a dot: ink at 6% over the surface.
  ['ink on dotted paper', 'ink', 'dot-paper', 4.5],
  ['muted on dotted paper', 'muted', 'dot-paper', 4.5],
  ['brand-700 link on dotted paper', 'brand-700', 'dot-paper', 4.5],
  ['ink on dotted soft wash', 'ink', 'dot-soft', 4.5],
  ['muted on dotted soft wash', 'muted', 'dot-soft', 4.5],
  ['brand-700 link on dotted soft wash', 'brand-700', 'dot-soft', 4.5],
  ['brand-600 on dotted soft wash', 'brand-600', 'dot-soft', 4.5],
  // accent-500 is a status DOT + border, never text, so the non-text 3:1 bar
  // applies rather than 4.5:1.
  ['accent-500 dot on dotted paper (non-text)', 'accent-500', 'dot-paper', 3],
  ['accent-500 dot on dotted soft (non-text)', 'accent-500', 'dot-soft', 3],

  // --- over the blue band (.bg-dots-brand) ---------------------------------
  // A white dot at 4% LIGHTENS the band, so it is white text contrast that
  // erodes here, not the accent. 5%+ breaks gold-300; 4% is the cap.
  ['white on dotted band', '#ffffff', 'dot-band', 4.5],
  ['white/90 on dotted band (composited)', '#ebebeb', 'dot-band', 4.5],
  ['gold-300 accent on dotted band', 'gold-300', 'dot-band', 4.5],
  ['white on the CTA gradient (hero button)', '#ffffff', 'brand-500', 4.5],
  ['white on the CTA gradient end', '#ffffff', 'brand-700', 4.5],
];

const DARK_PAIRS = [
  ['ink on paper', 'ink', 'paper', 4.5],
  ['muted on paper', 'muted', 'paper', 4.5],
  ['ink on surface', 'ink', 'surface', 4.5],
  ['muted on surface', 'muted', 'surface', 4.5],
  ['white on lifted brand-800 (band, dark)', '#ffffff', 'brand-800', 4.5],
  ['white on lifted brand-900 (band, dark)', '#ffffff', 'brand-900', 4.5],
  ['white on lifted brand-950 (band, dark)', '#ffffff', 'brand-950', 4.5],
  ['gold-300 accent word on dark band', 'gold-300', 'brand-800', 4.5],
  ['gold-400 on dark band', 'gold-400', 'brand-800', 4.5],
  ['brand-300 on surface (readable charcoal)', 'brand-300', 'surface', 4.5],
  ['accent-400 muted on paper', 'accent-400', 'paper', 4.5],
  ['signal-200 on signal-900 (dark error pill)', 'signal-200', 'signal-900', 4.5],
];

let failures = 0;
const run = (title, pairs, mode) => {
  console.log(`\n=== ${title} ===`);
  for (const [label, fg, bg, need] of pairs) {
    const bgHex = get(bg, mode);
    const fgHex = fg.startsWith('#') ? fg : get(fg, mode);
    const r = ratio(fgHex, bgHex);
    const pass = r >= need;
    if (!pass) failures += 1;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  (min ${need})  ${label}`);
  }
};

run('LIGHT MODE', LIGHT, 'light');
run('DARK MODE', DARK_PAIRS, 'dark');

// The hero "Get a quick quote" card is an opaque brand-950 panel. Its inner
// text sits directly on that navy, so the card gets its own pair list — the
// band pairs above do not cover it.
console.log('\n=== QUICK QUOTE CARD (opaque brand-950) ===');
// Translucent white is composited over the CARD, not over white — compositing
// white onto white would measure as pure white and hide a real failure.
const CARD_BG = get('brand-950', 'light');
const QUOTE_CARD_PAIRS = [
  ['heading white on the quote card', '#ffffff', 'brand-950', 4.5],
  ['subtitle white/70 on the quote card', composite(0.7, CARD_BG), 'brand-950', 4.5],
  ['footnote white/60 on the quote card', composite(0.6, CARD_BG), 'brand-950', 4.5],
  ['row label white/70 on the quote card', composite(0.7, CARD_BG), 'brand-950', 4.5],
  ['drivers-online gold-300 on brand-800 chip', 'gold-300', 'brand-800', 4.5],
  ['total label white on the brand-600 bar', '#ffffff', 'brand-600', 4.5],
  ['amount white on the brand-800 total cell', '#ffffff', 'brand-800', 4.5],
  ['distance value white on the brand-600 thumb', '#ffffff', 'brand-600', 4.5],
  ['slider track white/40 on the quote card', composite(0.4, CARD_BG), 'brand-950', 3],
  ['round-trip toggle off-state white/40 on the quote card', composite(0.4, CARD_BG), 'brand-950', 3],
];
run('QUOTE CARD', QUOTE_CARD_PAIRS, 'light');

// `btn-brand-gradient` sets a background-IMAGE, which paints over the
// background-COLOR that `bg-surface` sets. So a button styled
// `bg-surface !text-brand-900` ends up dark text on the blue gradient at
// 1.45:1 — invisible. Assert the primary CTA's real pairing instead.
console.log('\n=== PRIMARY CTA ON THE BLUE GRADIENT ===');
const CTA_PAIRS = [
  ['white on the gradient start', '#ffffff', 'brand-500', 4.5],
  ['white on the gradient end', '#ffffff', 'brand-700', 4.5],
];
run('PRIMARY CTA', CTA_PAIRS, 'light');

// Informational only — these two MUST stay far below 4.5:1. They are printed,
// never counted as failures, so the gate still passes. If a future change ever
// makes the inverted chip readable, this note becomes wrong.
console.log('\n  (the inverted-chip trap — expected to FAIL, not gated):');
for (const [label, fg, bg] of [
  ['brand-900 on gradient start', 'brand-900', 'brand-500'],
  ['brand-900 on gradient end', 'brand-900', 'brand-700'],
]) {
  console.log(
    `  n/a  ${ratio(get(fg, 'light'), get(bg, 'light')).toFixed(2).padStart(5)}:1  ${label}`
  );
}

console.log('\n=== TRANSLUCENT NAV TEXT ON THE CHARCOAL BAND ===');
for (const alpha of [0.75, 0.8, 0.9, 1]) {
  const bgHex = T.brand[800];
  const r = ratio(composite(alpha, bgHex), bgHex);
  const pass = r >= 4.5;
  if (!pass) failures += 1;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  white/${alpha * 100} on brand-800`);
}

console.log(`\n${failures === 0 ? 'ALL PAIRS PASS WCAG AA' : `${failures} FAILING PAIR(S)`}`);
process.exit(failures ? 1 : 0);
