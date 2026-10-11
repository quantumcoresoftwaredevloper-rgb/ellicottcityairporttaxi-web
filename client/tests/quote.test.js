/**
 * `lib/quote.js` powers the hero "Get a quick quote" widget.
 *
 * It mirrors the server's estimateFare(): base + km*perKm + min*perMin, using
 * the server's own FALLBACK_FARE. These tests pin the formula and the contract
 * that it is only ever an ESTIMATE — per-class pricing is deliberately not
 * public, so this must never claim to be a final price.
 */
import { describe, it, expect } from 'vitest';
import { estimateQuote, formatMoney } from '../src/lib/quote.js';

const FALLBACK = { base: 3, perKm: 1.4, perMin: 0.3 };
const MILES_TO_KM = 1.60934;
const AVG_SPEED_KMH = 45;

describe('estimateQuote', () => {
  it('charges only the base fare at zero distance', () => {
    const q = estimateQuote(0);
    expect(q.km).toBe(0);
    expect(q.minutes).toBe(0);
    expect(q.total).toBe(FALLBACK.base);
  });

  it('matches the server formula exactly', () => {
    const miles = 25;
    const km = miles * MILES_TO_KM;
    const minutes = (km / AVG_SPEED_KMH) * 60;
    const expected = FALLBACK.base + km * FALLBACK.perKm + minutes * FALLBACK.perMin;
    expect(estimateQuote(miles).total).toBe(Math.round(expected * 100) / 100);
  });

  it('is monotonic — more distance never costs less', () => {
    let prev = -1;
    for (const m of [0, 5, 10, 25, 50, 100]) {
      const { total } = estimateQuote(m);
      expect(total).toBeGreaterThan(prev);
      prev = total;
    }
  });

  it('never returns NaN for hostile input', () => {
    for (const input of [0, -5, NaN, undefined, null, 'abc']) {
      const { total } = estimateQuote(input);
      expect(Number.isFinite(total), `input ${String(input)} produced ${total}`).toBe(true);
      expect(total).toBeGreaterThanOrEqual(0);
    }
  });

  it('rounds to cents', () => {
    for (const m of [3, 7.5, 19, 33.3]) {
      const { total } = estimateQuote(m);
      expect(Math.round(total * 100) / 100).toBe(total);
    }
  });
});

describe('formatMoney', () => {
  it('renders a US dollar amount', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(3)).toBe('$3.00');
    expect(formatMoney(118.87)).toBe('$118.87');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });
});
