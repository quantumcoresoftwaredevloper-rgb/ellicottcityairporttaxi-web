import AppSetting from '../models/AppSetting.js';

// Admin-managed website content.
//
// Stored as ONE AppSetting key (`siteContent`) holding an object, so a save is a
// single atomic write instead of dozens of per-field keys. Every field has a
// default that mirrors the copy currently hardcoded in the React pages, so the
// site renders identically before an admin ever saves anything — and if the API
// is unreachable the client keeps using these same defaults.

export const CONTENT_KEY = 'siteContent';

export const CONTENT_DEFAULTS = {
  // Brand
  brandName: 'Ellicott City Airport Taxi',
  brandLineOne: 'Ellicott City',
  brandLineTwo: 'Airport Taxi',
  tagline: 'Airport transfers and black-car service across Maryland, DC and Virginia.',

  // Home hero
  heroEyebrow: 'Ellicott City, MD · Available 24/7',
  heroTitle: 'Ellicott City’s premier',
  heroHighlight: 'full-service',
  heroTitleTail: 'transportation provider',
  heroSubtitle:
    'Professional taxi, sedan and SUV service across Maryland, DC, and Virginia — airport transfers, corporate travel, weddings, events and more. Book online, pay upfront, track your driver live.',
  heroCtaLabel: 'Book your ride online',

  // Contact (shown site-wide: footer, navbar, contact page, auth panel)
  contactPhone: '410-365-5556',
  contactPhoneHref: '4103655556',
  contactEmail: 'chriskbonsu@gmail.com',
  contactAddress: '9019 Early April Way, Ellicott City, MD',
  serviceArea: 'Maryland, DC, and Virginia',
  hours: 'Available 24/7 — book online or call dispatch.',

  // About page intro
  aboutTitle: 'Built on punctuality',
  aboutHighlight: 'and trust',
  aboutBody:
    'Ellicott City Airport Taxi has spent years making Howard County feel smaller. From BWI runs at dawn to black-car service for corporate accounts, every trip is handled by a professional driver who knows the region — and prices quoted upfront, before you book.',

  // Home stat band
  stats: [
    { value: '24/7', label: 'Service, every day' },
    { value: '18+', label: 'Communities served' },
    { value: '10,000+', label: 'Rides completed' },
    { value: '5.0', label: 'Passenger rating' },
  ],

  // Home testimonials
  testimonials: [
    {
      quote:
        'Picked me up at BWI at 4:30am, drove the whole way professionally, and the fare was exactly what I saw on the app. Flawless.',
      name: 'Danielle R.',
      detail: 'Ellicott City, MD · Airport transfer',
    },
    {
      quote:
        'We booked a sedan for our wedding party of six. The drivers were early, immaculate, and so kind. Could not have asked for a smoother day.',
      name: 'Marcus & Priya',
      detail: 'Ellicott City, MD · Wedding',
    },
    {
      quote:
        'I use Ellicott City Airport Taxi every week for the commute to the office. Reliable, clean cars and the same great driver most mornings.',
      name: 'Jennifer W.',
      detail: 'Ellicott City, MD · Corporate account',
    },
  ],

  // Home service-area list
  serviceAreas: [
    'Columbia', 'Ellicott City', 'Elkridge', 'Fulton', 'Laurel', 'Savage',
    'Highland', 'Jessup', 'Clarksville', 'Dayton', 'West Friendship', 'Woodstock',
    'Glenelg', 'Glenwood', 'Mount Airy', 'Sykesville', 'Woodbine', 'Cooksville',
    'Marriottsville', 'Hanover', 'Simpsonville', 'Lisbon', 'Annapolis Junction',
  ],

  // Auth panel proof points
  authProof: [
    'Licensed & insured chauffeurs',
    '24/7 dispatch, upfront flat fares',
    'Every airport · BWI, IAD, DCA',
  ],
  authHeadline: { title: 'Every ride,', highlight: 'handled.' },
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Hard caps so a bad admin payload can never bloat the document or the page.
const MAX_STRING = 2000;
const MAX_ITEMS = 60;

// The incoming type must match the default's type — a number is never a valid
// stand-in for a string field, and unknown keys are dropped entirely.
const coerce = (key, value, fallback) => {
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : undefined;
  }
  if (isPlainObject(fallback)) {
    if (!isPlainObject(value)) return undefined;
    const out = { ...fallback };
    for (const [k, v] of Object.entries(value)) {
      if (typeof fallback[k] === 'string' && typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
    }
    return out;
  }
  if (typeof fallback === 'string' && typeof value === 'string') {
    return value.slice(0, MAX_STRING);
  }
  return undefined;
};

// Only these keys may be written, so a bad admin payload can never blank out
// the whole site.
const validate = (patch) => {
  const clean = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (!Object.prototype.hasOwnProperty.call(CONTENT_DEFAULTS, key)) continue;
    const coerced = coerce(key, value, CONTENT_DEFAULTS[key]);
    if (coerced !== undefined) clean[key] = coerced;
  }
  return clean;
};

export const getContent = async () => {
  const row = await AppSetting.findOne({ key: CONTENT_KEY }).lean();
  const stored = isPlainObject(row?.value) ? row.value : {};
  const merged = { ...CONTENT_DEFAULTS };
  for (const key of Object.keys(CONTENT_DEFAULTS)) {
    if (!Object.prototype.hasOwnProperty.call(stored, key)) continue;
    const coerced = coerce(key, stored[key], CONTENT_DEFAULTS[key]);
    if (coerced !== undefined) merged[key] = coerced;
  }
  return merged;
};

export const updateContent = async (patch) => {
  const clean = validate(patch);
  const next = { ...(await getContent()), ...clean };
  await AppSetting.findOneAndUpdate(
    { key: CONTENT_KEY },
    { value: next },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return next;
};
