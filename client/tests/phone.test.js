/**
 * `lib/phone.js` decides how the phone number is DISPLAYED everywhere.
 *
 * The parentheses were dropped because `(410) 365-5556` reads as a bend at each
 * end of the number; the display format is now 410-365-5556. The function
 * normalises on RENDER so a value saved with parentheses before that change
 * still displays straight.
 */
import { describe, it, expect } from 'vitest';
import { formatPhoneDisplay } from '../src/lib/phone.js';

describe('formatPhoneDisplay', () => {
  it('strips parentheses into the straight format', () => {
    expect(formatPhoneDisplay('(410) 365-5556')).toBe('410-365-5556');
  });

  it('is idempotent', () => {
    expect(formatPhoneDisplay('410-365-5556')).toBe('410-365-5556');
    expect(formatPhoneDisplay(formatPhoneDisplay('(410) 365-5556'))).toBe('410-365-5556');
  });

  it('handles the other common formats', () => {
    expect(formatPhoneDisplay('410.365.5556')).toBe('410-365-5556');
    expect(formatPhoneDisplay('410 365 5556')).toBe('410-365-5556');
    expect(formatPhoneDisplay('+1 (410) 365-5556')).toBe('410-365-5556');
  });

  it('drops a US country code', () => {
    expect(formatPhoneDisplay('14103655556')).toBe('410-365-5556');
  });

  it('leaves anything it cannot confidently format alone', () => {
    // Better to show a weird value than to mangle it.
    expect(formatPhoneDisplay('')).toBe('');
    expect(formatPhoneDisplay(null)).toBe('');
    expect(formatPhoneDisplay(undefined)).toBe('');
    expect(formatPhoneDisplay('Call us')).toBe('Call us');
  });

  it('never emits parentheses — that was the whole point', () => {
    for (const input of ['(410) 365-5556', '4103655556', '410 365 5556']) {
      expect(formatPhoneDisplay(input)).not.toMatch(/[()]/);
    }
  });
});
