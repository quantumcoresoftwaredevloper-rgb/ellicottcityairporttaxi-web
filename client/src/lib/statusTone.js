// Single source of truth for status + payment badge colors so every page
// (passenger, driver, admin, CRM) renders identical pills for the same state.
// Uses the design tokens: signal-* (red = live/active/failed — the only red in
// the system), success-* (green, done/paid), gold-* (waiting),
// accent-* (neutral/inactive).

const RIDE_TONE = {
  pending: 'bg-accent-100 text-accent-700',
  accepted: 'bg-accent-100 text-accent-700',
  arriving: 'bg-accent-100 text-accent-700',
  in_progress: 'bg-signal-50 text-signal-700',
  completed: 'bg-success-50 text-success-700',
  cancelled: 'bg-accent-100 text-muted',
};

const PAY_TONE = {
  pending: 'bg-gold-50 text-gold-700',
  succeeded: 'bg-success-50 text-success-700',
  cash: 'bg-gold-100 text-gold-700',
  failed: 'bg-signal-50 text-signal-700',
  refunded: 'bg-accent-100 text-accent-700',
};

// Finance/CRM cards use a colored top border + dot per payment state.
const PAY_ACCENT = {
  succeeded: { dot: 'bg-success-500', text: 'text-success-700', top: 'border-t-success-500' },
  cash: { dot: 'bg-gold-500', text: 'text-gold-700', top: 'border-t-gold-500' },
  pending: { dot: 'bg-gold-500', text: 'text-gold-700', top: 'border-t-gold-500' },
  failed: { dot: 'bg-signal-500', text: 'text-signal-700', top: 'border-t-signal-500' },
  refunded: { dot: 'bg-accent-500', text: 'text-accent-700', top: 'border-t-accent-500' },
};

// The Badge <tone> prop used across the CRM/Driver portals.
const BADGE_TONE = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-white',
  green: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-200',
  red: 'bg-signal-50 text-signal-700 dark:bg-signal-900 dark:text-signal-200',
  gold: 'bg-gold-100 text-gold-700 dark:bg-gold-900 dark:text-gold-200',
  blue: 'bg-accent-100 text-accent-700 dark:bg-accent-800 dark:text-accent-300',
  slate: 'bg-accent-100 text-muted dark:bg-accent-800 dark:text-accent-300',
};

export const rideTone = (status) => RIDE_TONE[status] || RIDE_TONE.pending;
export const payTone = (status) => PAY_TONE[status] || PAY_TONE.pending;
export const payAccent = (status) => PAY_ACCENT[status] || PAY_ACCENT.pending;
export const badgeTone = (tone) => BADGE_TONE[tone] || BADGE_TONE.slate;

export { RIDE_TONE, PAY_TONE, PAY_ACCENT, BADGE_TONE };
