/**
 * Client-side fare ESTIMATE for the hero "Get a quick quote" widget.
 *
 * The formula mirrors `estimateFare()` in the server's rideService:
 *
 *   total = base + distanceKm * perKm + durationMin * perMin
 *
 * The rates are the server's own `FALLBACK_FARE` constant, not a number invented
 * for the client. Per-class pricing is deliberately NOT public (`GET /api/fleet`
 * omits `fare`), so the card quotes the standard baseline rate and says so — it
 * is an estimate for a distance, not a price for a chosen class. The server
 * recomputes the real fare from the routed trip and the selected class when the
 * ride is created, which is why the UI never presents this as a final price.
 *
 * If this rate is ever allowed to drift from the server, the fix is a public
 * estimate endpoint that owns the pricing — not a second copy of the numbers.
 */

/** Mirrors FALLBACK_FARE in server/src/services/catalogService.js */
const RATE = { base: 3, perKm: 1.4, perMin: 0.3 };

/** Average city/suburban driving speed used to turn distance into time. */
const AVG_SPEED_KMH = 45;

const MILES_TO_KM = 1.60934;

/**
 * @param {number} miles  one-way trip distance in miles
 * @returns {{ km: number, minutes: number, total: number }}
 */
export function estimateQuote(miles) {
  // Coerce defensively: this feeds a money value, and `Math.max(0, NaN)` is NaN,
  // which would render as "$NaN" on the card. The slider only ever emits numbers,
  // but a quote must never be able to display a non-number.
  const n = Number(miles);
  const safeMiles = Number.isFinite(n) ? Math.max(0, n) : 0;
  const km = safeMiles * MILES_TO_KM;
  const minutes = (km / AVG_SPEED_KMH) * 60;
  const total = RATE.base + km * RATE.perKm + minutes * RATE.perMin;
  return {
    km: Math.round(km * 10) / 10,
    minutes: Math.round(minutes),
    total: Math.round(total * 100) / 100,
  };
}

export const formatMoney = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
