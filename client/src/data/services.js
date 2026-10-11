// Service offerings — OFFLINE FALLBACK only. The live source of truth is the
// ServiceOffering collection an admin manages in /admin/content; this file is
// what renders when `GET /api/services` is slow or unreachable, which is the
// normal case on a deployed site that has not set VITE_API_URL.
//
// This list is a verbatim mirror of SERVICE_DEFAULTS in
// server/src/services/catalogService.js — slug, name, short, icon NAME,
// `featured`, tagline, summary and features all included.
//
// It has drifted before, in ways that were only visible in production:
// `icon: ''` blanked every service icon and `featured: false` emptied the Home
// featured band entirely (12 service links dropped to 7). Note `icon` is a
// NAME string, not a component: `ServiceIcon` resolves it through
// lib/iconMap.js, and rendering `<s.icon />` on a component value silently
// produces a literal <s> element.
//
// `npm run check:catalog` diffs this file against the server defaults and
// fails on any drift. Run it after editing either side.
export const SERVICES = [
  {
    slug: 'airport',
    name: 'Airport Transfers',
    short: 'Airport',
    icon: 'plane',
    featured: true,
    tagline: 'BWI, DCA, IAD and beyond',
    summary:
      'Flight-tracked pickups, curbside meet-and-greet and a driver already waiting when your flight lands. We watch delays so a late flight never means a late ride.',
    features: [
      'Real-time flight tracking',
      'Free waiting time after delays',
      'Meet-and-greet with name board',
      'Terminal-to-terminal transfers',
      'Luggage assistance',
      'BWI, DCA and IAD covered',
    ],
  },
  {
    slug: 'corporate',
    name: 'Corporate Travel',
    short: 'Corporate',
    icon: 'briefcase',
    featured: true,
    tagline: 'A dedicated account for your team',
    summary:
      'Monthly invoicing, a named account manager and guaranteed vehicles for client meetings, site visits and team travel across the Mid-Atlantic.',
    features: [
      'Centralised monthly billing',
      'Named account manager',
      'Guaranteed vehicle classes',
      'Priority dispatch during peak',
      'Booking portal for teams',
      'Receipts itemised per traveller',
    ],
  },
  {
    slug: 'wedding',
    name: 'Wedding Transportation',
    short: 'Weddings',
    icon: 'gem',
    featured: true,
    tagline: 'Guests arrive on time, always',
    summary:
      'Block guest shuttles, package the wedding party timeline and keep the whole celebration moving with vehicles that photograph well.',
    features: [
      'Guest block and itineraries',
      'Wedding party packages',
      'Decorated vehicles on request',
      'Coordination with your venue',
      'Late-night return trips',
      'Second-event coverage',
    ],
  },
  {
    slug: 'prom',
    name: 'Prom & Celebrations',
    short: 'Proms',
    icon: 'partyPopper',
    featured: false,
    tagline: 'The night everyone remembers',
    summary:
      'Premium sedans and SUVs with chauffeurs who know how to make a formal occasion feel special, plus photo-friendly arrival timing.',
    features: [
      'Premium and luxury classes',
      'Dress-code-aware chauffeurs',
      'Group pickup coordination',
      'Photo-stop itineraries',
      'Return trips after the event',
      'Complimentary amenities',
    ],
  },
  {
    slug: 'shuttle',
    name: 'Employee & Corporate Shuttles',
    short: 'Shuttles',
    icon: 'bus',
    featured: true,
    tagline: 'Fixed routes, counted on daily',
    summary:
      'Recurring commuter routes, campus loops and shift shuttles run to the same timetable every day, with consolidated reporting.',
    features: [
      'Fixed daily timetables',
      'Recurring booking schedules',
      'Multiple vehicle classes',
      'Passenger manifests',
      'On-time performance reporting',
      'Dedicated vehicles available',
    ],
  },
  {
    slug: 'charter',
    name: 'Charter Bus Trips',
    short: 'Charter Bus',
    icon: 'bus',
    featured: false,
    tagline: 'Your itinerary, our vehicles',
    summary:
      'Day trips, multi-day tours and one-off group movement with drivers who stay with your group for the whole booking.',
    features: [
      'Motorcoach and mini-coach options',
      'Multi-day and overnight trips',
      'Custom itineraries',
      'Restroom-equipped coaches',
      'Baggage handling included',
      'Flexible departure times',
    ],
  },
  {
    slug: 'night-out',
    name: 'Night Out',
    short: 'Night Out',
    icon: 'moonStar',
    featured: true,
    tagline: 'Safe rides, whatever the hour',
    summary:
      'Hourly packages and after-hours airport runs so the drive home is never the part of the evening you have to think about.',
    features: [
      'Hourly and multi-hour packages',
      'Late-night airport runs',
      'Designated sober driver option',
      'Vetted professional drivers',
      'Pay by the hour or the trip',
      'Event wait included',
    ],
  },
  {
    slug: 'funeral',
    name: 'Funeral & Memorial',
    short: 'Funerals',
    icon: 'heart',
    featured: false,
    tagline: 'Quiet, dignified transport',
    summary:
      'Compassionate, punctual vehicles for funeral transportation, memorial services and family arrivals, handled with discretion.',
    features: [
      'Dignified, unmarked vehicles',
      'Family and clergy transport',
      'Punctual arrival windows',
      'Discreet, professional drivers',
      'Waiting during services',
      'Accessibility considered',
    ],
  },
  {
    slug: 'school',
    name: 'School Transportation',
    short: 'Schools',
    icon: 'school',
    featured: false,
    tagline: 'Contracted routes and field trips',
    summary:
      'Contracted school routes, activity trips and campus shuttles with the documentation and reliability districts expect.',
    features: [
      'Contracted route programmes',
      'Field and activity trips',
      'Campus circulation',
      'Supervision-friendly seating',
      'Documentation provided',
      'Background-checked drivers',
    ],
  },
  {
    slug: 'valet',
    name: 'Valet Parking',
    short: 'Valet',
    icon: 'car',
    featured: false,
    tagline: 'Your car looked after, on return',
    summary:
      'Airport and venue valet services with attendants who take the vehicle, return it valeted, and handle the car park booking for you.',
    features: [
      'Airport and venue valet',
      'Car park booking handled',
      'Attendants in uniform',
      'Vehicle returned valeted',
      'Oversized vehicle handling',
      'Key custody receipt',
    ],
  },
];

export const serviceLabel = (slug) =>
  SERVICES.find((s) => s.slug === slug)?.name ||
  (slug || '').replace(/-/g, ' ');
