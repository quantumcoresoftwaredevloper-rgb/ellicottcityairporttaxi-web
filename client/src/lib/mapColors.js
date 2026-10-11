/**
 * Single source of truth for the colours that CANNOT come from a CSS token.
 *
 * Leaflet's `pathOptions` and divIcon SVG attributes need a raw hex string, so
 * these values are unavoidably duplicated across the map components. Keeping
 * them here means the map and the design system cannot drift apart.
 *
 * ROUTE_RED is the *functional signal* red (matches `--color-signal-600`),
 * NOT a brand colour. Red is deliberately not a brand color in this design:
 * branding is charcoal, the accent is orange, and red is reserved for things
 * that mean live / active / failed.
 */
export const ROUTE_RED = '#c22020';   // = --color-signal-600
export const PICKUP_BLUE = '#0b60a9'; // = the "you are here" / passenger dot
