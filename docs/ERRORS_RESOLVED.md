# Errors Found and Resolved

A record of every defect found while hardening this project, what caused it, and
what now stops it coming back. Ordered by severity, not by when they were fixed.

The recurring theme: **almost none of these crashed.** The app degraded quietly —
a page rendered, but with less on it than it should have. That is why the test
suites assert the *degraded* path as much as the happy one.

---

## 1. Server could not start at all

**Symptom** — `node src/index.js` died immediately:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../node_modules/stripe/esm/resources/Sigma/ScheduledQueryRuns.js'
imported from '.../node_modules/stripe/esm/resources.js'
```

**Cause** — a corrupted npm install. `stripe@22.5.0` was present at the right
version, but 1 of its 139 ESM resource files was missing from the tarball.
Nothing in `package.json` was wrong, so reinstalling looked unnecessary.

**Fix** — delete and reinstall the package; verified all 139 resources resolve.

**Guard** — `server/tests/catalog.test.js` and the rest boot the real app, so a
dependency that cannot be imported fails the suite immediately.

---

## 2. `npm run seed` produced drivers who could not go online

**Symptom** — following the documented setup (`npm run seed`, log in as
`alex@ridetaxi.com`, go online) returned **403 "not verified"**. Both seeded
drivers were locked out.

**Cause** — the driver-verification workflow added
`driverDetails.verificationStatus`, which correctly defaults to `'none'`, plus a
correct server-side 403 in `setAvailability()`. Neither is wrong on its own — but
the seed never set the field, so every seeded driver was treated as new and
unverified. The one-off `npm run migrate:drivers` script hid it locally, which is
worse than the bug: it masked the problem instead of fixing it.

**Fix** — the seed now creates drivers with `verificationStatus: 'verified'`.

**Guard** — `server/tests/seed.test.js` runs the **real seed script** as a child
process against an in-memory Mongo and asserts every seeded driver can go online.
It fails with a named message:

```
seeded driver alex@ellicot.com is not verified and cannot go online:
expected 'none' to be 'verified'
```

Verified to fail when the fix is reverted.

**Why a real database, not mocks** — a mocked `User` model would have returned
the default happily and passed this change. This class of bug (a new field with a
default excluding existing documents) can only be caught against a real document
store.

---

## 3. The Fleet page lost every description in production

**Symptom** — on Vercel the fleet grid showed photos, capacity and "Book now",
but no tagline and no feature lists. Locally it was perfect.

**Cause** — the site was serving the **offline catalog fallback** rather than the
API. This is the normal case on a deploy with no `VITE_API_URL`: `api.js` falls
back to `/api` on its own origin, gets a 404, and `CatalogContext` renders from
`data/vehicles.js`. That file carried `image` and `seats` but had
`tagline: ''` and `features: []`.

**Fix** — both fallback lists now mirror the server's `FLEET_DEFAULTS` and
`SERVICE_DEFAULTS` field for field, and are normalised on render.

**Guard** — `npm run check:catalog` diffs the two lists field by field and exits
non-zero on drift, plus `client/tests/catalogFallback.test.js`. Proven to catch
all four original variants (empty image, empty tagline, empty features, wrong
seat count).

---

## 4. Home featured band emptied itself (12 service links → 7)

**Symptom** — the Home page's featured services band was blank when the API was
unreachable.

**Cause** — same class as #3: `FALLBACK_SERVICES` hardcoded `icon: ''` (all
service icons blank) and `featured: false` (the band has nothing to show).

**Fix** — `data/services.js` is now a verbatim mirror of `SERVICE_DEFAULTS`,
including the `featured` flags and icon *names*.

**Guard** — `check:catalog`, plus an e2e test asserting each of the five
featured slugs is present on Home with the API aborted.

---

## 5. Invisible buttons (dark text on a blue gradient, 1.45:1)

**Symptom** — several hero and section CTAs were effectively unreadable:
"Book a vehicle now", "Secure your ride", "Book now", and nine more in the app.

**Cause** — a CSS layering trap:

```jsx
<Button className="bg-white !text-brand-900" />
```

`btn-brand-gradient` sets a **`background-image`**, which paints *over* the
**`background-color`** that `bg-white` sets. So the chip stays blue, while
`!text-brand-900` still wins the text. Result: `#063050` on `#08487e` = **1.45:1**,
far below the 4.5:1 minimum.

**Fix** — removed the inverted treatment; these use the default primary variant
with white text (5.7:1 to 9.4:1). 5 in the web app, 9 in the mobile app.

**Guard** — `check:contrast` asserts the correct pairing and prints the inverted
one as a documented, non-gated trap; an e2e test asserts the CTA's computed
colour is white.

---

## 6. The pay modal showed a different number than the footer

**Symptom** — `(410) 365-5556` in the cash-payment note, `410-365-5556`
everywhere else.

**Cause** — two independent settings, edited in two admin screens:
`settingsService.supportPhone` still had parentheses after `contactPhone` was
changed.

**Fix** — both default to the straight format, and `PaymentModal` normalises on
render so an admin-entered parenthesised value still displays straight.

**Guard** — `catalog.test.js` asserts `settings.supportPhone === content.contactPhone`.

---

## 7. The quote card could display "$NaN"

**Symptom** — `estimateQuote('abc')` returned `NaN`.

**Cause** — `Math.max(0, NaN)` is `NaN`. The slider only ever emits numbers, so
this never fired in practice, but it feeds a money value.

**Fix** — coerce with `Number()` and fall back to 0 when not finite.

**Guard** — `client/tests/quote.test.js` feeds `NaN`, `null`, `undefined`, `'abc'`
and negatives.

---

## 8. The Home image band cropped the car

**Symptom** — the roof and wheels of the executive sedan were cut off.

**Cause** — `h-72 sm:h-96` + `object-cover` on a 1992×1056 (1.89:1) photo. At
1440px wide the band is 3.75:1, so `cover` cropped roughly 40% of the image.

**Fix** — the image sets its own height, a second scrim fades the photo's white
studio background into the navy band, and on phones the copy moves below the
photo rather than sitting on it.

---

## 9. Dotted world map: solid white dots, then a 404

Two bugs in one feature, found only because each was checked in a real browser.

**9a — the texture rendered solid white.** The SVG used `fill="currentColor"`,
but `color` is *also* the text colour, so every section's `text-white` utility
silently overrode the ink. Fixed by baking the alpha into two files
(`dot-world-map.svg`, `dot-world-map-band.svg`).

**9b — the asset 404'd in production.** Vite does not rewrite `url()` inside a
`background-image` custom property, so an SVG in `src/assets/` was never emitted.
It lives in `public/assets/` now.

---

## 10. Slider track failed WCAG (2.24:1)

**Symptom** — the quote card's distance track was `white/25` on the navy card.

**Cause** — invisible to a contrast checker because the checker was not covering
that card.

**Fix** — `white/40` (3.68:1). WCAG requires 3:1 for a control boundary, not the
4.5:1 used for text.

**Guard** — the card now has its own pair list in `check:contrast`.

---

## 11. Logo asset damage and bloat

**11a — the remove.bg export deleted the windscreen.** Measured: 64% of the
windscreen glass and small holes in the roof, bonnet and wing mirror were made
transparent. Because the logo sits on a *white* plate, those holes would have
rendered as white patches through the black car. Fixed by
`repair_interior_holes()`, which floods the transparent region in from the border
and restores anything unreached from the pixel-aligned source (2526 px).

A related false alarm, recorded because it shaped the fix: the artwork's studio
background is luminance **247** and the windscreen glass is *also* median **247**.
So transparent-vs-original is a 3% difference on white — invisible. The real
damage was only in the genuinely dark panels.

**11b — the assets were hugely oversized.** `logo-full.png` was 211 KB for a
160px display slot. Exported at 3× instead of source size: 26 KB and ~200 KB.
WebP would take the lockup from ~200 KB to ~57 KB, but that is a format change
across every reference and was deliberately left alone.

---

## 12. Errors I introduced while writing the tests

Recorded because each would have shipped as a silent false negative — a test that
passes while asserting nothing.

| Bug | How it was caught |
|-----|-------------------|
| Test helper passed a pre-hashed password; `User`'s `pre('save')` hook hashed it again → 401 | Login assertion failed |
| Geocoding stub returned identical coords for both stops → "must be different locations" | Ride creation 400 |
| Tests never seeded the catalog (it seeds on boot, which tests skip) → "Unknown vehicle" | Ride creation 400 |
| A `.catch(() => null)` around a `.jsx` import made one test a **silent no-op** | Verified by trying the import standalone; replaced with a real source assertion |
| Regex too loose → matched the *correct* template-literal form → false failure | Tightened to match `="...{CONST}..."` only |
| Guessed the env var as `LOGIN_RATE_LIMIT`; assumed `CLIENT_ORIGIN` was required | Read the real `validateEnv` and corrected |
| Wrote `npm run migrate:doors` in AGENTS.md; the script is `migrate:drivers` | Checked against `package.json` |
| Phone replacement produced `aria-label="Call {CONTACT_PHONE}"` — a literal string a screen reader would announce | ESLint flagged the resulting unused import; now guarded by a test |
| Invalid `test.use({ route })` in Playwright (`route` is not a fixture) | Behaviour differed from a plain per-test `page.route` |
| `/privacy` renders two `<header>` elements → strict-mode violation | Used `.first()` |
| Featured-band count raced the scroll reveal | Asserted the invariant (the five featured slugs) instead of a raw count |

---

## Standing state

| Gate | Result |
|------|--------|
| `server: npm test` | 44 passed |
| `client: npm test` | 25 passed |
| `client: npm run test:e2e` | 22 passed |
| app `client: npm test` | 117 passed |
| `check:catalog` | fallback matches the server |
| `check:contrast` | all pairs pass WCAG AA |

All run in CI on every push (`.github/workflows/ci.yml`).

## Known outstanding

- **`VITE_API_URL` is unset on Vercel.** Login, booking, tracking and payments
  are non-functional there until Render + MongoDB Atlas exist. Marketing pages
  degrade correctly — that is what #3 and #4 fixed — but the funnel is dead.
- **No MongoDB Atlas cluster exists yet.** `assertEnv()` refuses to boot a
  production API against a localhost database.
- **The Playwright suite has never executed in CI.** It passes locally; the
  first push is its real test.
- **The dev database holds 86 passengers and 6 leftover test accounts**
  (`doctest…`, `reviewtest…`, `fresh…`) from manual testing. `npm run seed` wipes
  users, so this is cosmetic.
- **The mobile app still lacks the dotted world-map texture** and `lib/phone.js`
  (it uses `data/site.js` instead). Intentional, not an oversight.
