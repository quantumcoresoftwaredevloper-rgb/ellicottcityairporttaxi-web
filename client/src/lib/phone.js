/**
 * Display formatting for the business phone number.
 *
 * The number is stored and displayed as straight digits — `410-365-5556`.
 * Parentheses around the area code were dropped because they read as a "bend"
 * at each end of the number; dashes give the same grouping on a flat baseline.
 *
 * This normalises on RENDER rather than relying on what is stored, so a value
 * that was saved as `(410) 365-5556` before this change still displays straight.
 * `contactPhoneHref` is separate and stays digits-only for `tel:` links.
 */
export function formatPhoneDisplay(value) {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // Anything else (extension, already-formatted, empty) is left alone rather
  // than mangled.
  return raw;
}
