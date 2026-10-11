import FleetVehicle from '../models/FleetVehicle.js';
import ServiceOffering from '../models/ServiceOffering.js';
import Ride from '../models/Ride.js';
import User from '../models/User.js';

const fail = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

// Defaults merge the three datasets that used to be hardcoded:
//   - data/vehicles.js          (booking dropdown: key/label/desc)
//   - marketing/Fleet.jsx       (marketing card: image/capacity/tagline/features)
//   - rideService.estimateFare  (per-class fares)
//   - data/services.js          (service copy)
export const FLEET_DEFAULTS = [
  {
    key: 'executive-sedan', label: 'Executive Sedan', desc: 'Up to 4 riders',
    capacity: '1–4 passengers', seats: 4, bags: 2,
    image: '/images/ececutive-sedan.png', icon: 'car',
    tagline: 'Late-model, "all black" sedan',
    features: [
      'Seats up to 4 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 6, perKm: 1.9, perMin: 0.4 },
  },
  {
    key: 'economy-sedan', label: 'Economy Sedan', desc: 'Up to 4 riders',
    capacity: '1–4 passengers', seats: 4, bags: 2,
    image: '/images/economy-sedan.png', icon: 'car',
    tagline: 'Everyday rides and airport runs',
    features: [
      'Seats up to 4 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 3, perKm: 1.4, perMin: 0.3 },
  },
  {
    key: 'economy-suv', label: 'Economy SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 3,
    image: '/images/economy-suv.png', icon: 'carFront',
    tagline: 'Late-model, "all black" SUV',
    features: [
      'Seats up to 6 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 5, perKm: 1.8, perMin: 0.4 },
  },
  {
    key: 'premium-suv', label: 'Premium SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 3,
    image: '/images/premium-suv.png', icon: 'carFront',
    tagline: 'Roomier SUV with extra luggage space',
    features: [
      'Seats up to 6 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 7, perKm: 2.2, perMin: 0.45 },
  },
  {
    key: 'luxury-suv', label: 'Luxury SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 4,
    image: '/images/luxury-suv.png', icon: 'gem',
    tagline: 'Top-of-fleet SUV for executives and families',
    features: [
      'Seats up to 6 comfortably', 'Premium leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 10, perKm: 2.6, perMin: 0.5 },
  },
  {
    key: 'van', label: 'Van', desc: 'Up to 14 riders',
    capacity: '10–14 passengers', seats: 14, bags: 8,
    image: '/images/Van.png', icon: 'bus',
    tagline: 'Space for groups & luggage',
    features: [
      'Seats up to 14 without luggage', 'Seats 9 with luggage',
      'Bench seating', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 8, perKm: 2, perMin: 0.42 },
  },
  {
    key: 'mini-coach', label: 'Mini-Coach', desc: 'Up to 32 riders',
    capacity: '25–32 passengers', seats: 32, bags: 16,
    image: '/images/mini-coach.png', icon: 'bus',
    tagline: 'Groups of every size',
    features: [
      'Seats up to 32 passengers', 'Additional luggage space', 'Forward seating',
      'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 35, perKm: 3.5, perMin: 0.8 },
  },
  {
    key: 'school-bus', label: 'School Bus', desc: 'Up to 48 riders',
    capacity: '42–48 passengers', seats: 48, bags: 0,
    image: '/images/School-bus.png', icon: 'school',
    tagline: 'Safe routes & field trips',
    features: [
      'Seats 42 to 48 passengers', 'Bench seating', 'Air conditioning upon request',
      'Large, manual-opening windows', 'Professional chauffeur in uniform',
    ],
    fare: { base: 45, perKm: 4, perMin: 0.9 },
  },
  {
    key: 'motorcoach', label: 'Motorcoach', desc: 'Up to 56 riders',
    capacity: '50–56 passengers', seats: 56, bags: 30,
    image: '/images/Motorcoach.png', icon: 'bus',
    tagline: 'Long-haul group travel',
    features: [
      'Seats up to 56 passengers', 'Restroom on board', 'DVD & entertainment',
      'Overhead luggage bins', 'Large under-vehicle luggage area',
      'Air conditioning', 'Professional chauffeur in uniform',
    ],
    fare: { base: 70, perKm: 5, perMin: 1.2 },
  },
];

export const SERVICE_DEFAULTS = [
  { slug: 'airport', name: 'Airport Transfers', short: 'Airport', icon: 'plane', featured: true, tagline: 'BWI, DCA, IAD and beyond', summary: 'Flight-tracked pickups, curbside meet-and-greet and a driver already waiting when your flight lands. We watch delays so a late flight never means a late ride.', features: ['Real-time flight tracking', 'Free waiting time after delays', 'Meet-and-greet with name board', 'Terminal-to-terminal transfers', 'Luggage assistance', 'BWI, DCA and IAD covered'] },
  { slug: 'corporate', name: 'Corporate Travel', short: 'Corporate', icon: 'briefcase', featured: true, tagline: 'A dedicated account for your team', summary: 'Monthly invoicing, a named account manager and guaranteed vehicles for client meetings, site visits and team travel across the Mid-Atlantic.', features: ['Centralised monthly billing', 'Named account manager', 'Guaranteed vehicle classes', 'Priority dispatch during peak', 'Booking portal for teams', 'Receipts itemised per traveller'] },
  { slug: 'wedding', name: 'Wedding Transportation', short: 'Weddings', icon: 'gem', featured: true, tagline: 'Guests arrive on time, always', summary: 'Block guest shuttles, package the wedding party timeline and keep the whole celebration moving with vehicles that photograph well.', features: ['Guest block and itineraries', 'Wedding party packages', 'Decorated vehicles on request', 'Coordination with your venue', 'Late-night return trips', 'Second-event coverage'] },
  { slug: 'prom', name: 'Prom & Celebrations', short: 'Proms', icon: 'partyPopper', tagline: 'The night everyone remembers', summary: 'Premium sedans and SUVs with chauffeurs who know how to make a formal occasion feel special, plus photo-friendly arrival timing.', features: ['Premium and luxury classes', 'Dress-code-aware chauffeurs', 'Group pickup coordination', 'Photo-stop itineraries', 'Return trips after the event', 'Complimentary amenities'] },
  { slug: 'shuttle', name: 'Employee & Corporate Shuttles', short: 'Shuttles', icon: 'bus', featured: true, tagline: 'Fixed routes, counted on daily', summary: 'Recurring commuter routes, campus loops and shift shuttles run to the same timetable every day, with consolidated reporting.', features: ['Fixed daily timetables', 'Recurring booking schedules', 'Multiple vehicle classes', 'Passenger manifests', 'On-time performance reporting', 'Dedicated vehicles available'] },
  { slug: 'charter', name: 'Charter Bus Trips', short: 'Charter Bus', icon: 'bus', tagline: 'Your itinerary, our vehicles', summary: 'Day trips, multi-day tours and one-off group movement with drivers who stay with your group for the whole booking.', features: ['Motorcoach and mini-coach options', 'Multi-day and overnight trips', 'Custom itineraries', 'Restroom-equipped coaches', 'Baggage handling included', 'Flexible departure times'] },
  { slug: 'night-out', name: 'Night Out', short: 'Night Out', icon: 'moonStar', featured: true, tagline: 'Safe rides, whatever the hour', summary: 'Hourly packages and after-hours airport runs so the drive home is never the part of the evening you have to think about.', features: ['Hourly and multi-hour packages', 'Late-night airport runs', 'Designated sober driver option', 'Vetted professional drivers', 'Pay by the hour or the trip', 'Event wait included'] },
  { slug: 'funeral', name: 'Funeral & Memorial', short: 'Funerals', icon: 'heart', tagline: 'Quiet, dignified transport', summary: 'Compassionate, punctual vehicles for funeral transportation, memorial services and family arrivals, handled with discretion.', features: ['Dignified, unmarked vehicles', 'Family and clergy transport', 'Punctual arrival windows', 'Discreet, professional drivers', 'Waiting during services', 'Accessibility considered'] },
  { slug: 'school', name: 'School Transportation', short: 'Schools', icon: 'school', tagline: 'Contracted routes and field trips', summary: 'Contracted school routes, activity trips and campus shuttles with the documentation and reliability districts expect.', features: ['Contracted route programmes', 'Field and activity trips', 'Campus circulation', 'Supervision-friendly seating', 'Documentation provided', 'Background-checked drivers'] },
  { slug: 'valet', name: 'Valet Parking', short: 'Valet', icon: 'car', tagline: 'Your car looked after, on return', summary: 'Airport and venue valet services with attendants who take the vehicle, return it valeted, and handle the car park booking for you.', features: ['Airport and venue valet', 'Car park booking handled', 'Attendants in uniform', 'Vehicle returned valeted', 'Oversized vehicle handling', 'Key custody receipt'] },
];

const normalise = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Populated once at boot. Idempotent: it inserts only into an empty collection so
// an admin who deliberately deletes every class is not fighting the seed.
export const ensureCatalogDefaults = async () => {
  if ((await FleetVehicle.estimatedDocumentCount()) === 0) {
    await FleetVehicle.insertMany(
      FLEET_DEFAULTS.map((v, i) => ({ ...v, sortOrder: i, active: true }))
    );
  }
  if ((await ServiceOffering.estimatedDocumentCount()) === 0) {
    await ServiceOffering.insertMany(
      SERVICE_DEFAULTS.map((s, i) => ({ ...s, sortOrder: i, active: true }))
    );
  }
};

// ---------------------------------------------------------------- fleet
// Fares are admin-only: the public endpoint must not publish pricing, the
// passenger sees the computed estimate on their quote instead.
const publicFleet = (v, { withFare = false } = {}) => ({
  _id: v._id,
  key: v.key, label: v.label, desc: v.desc, capacity: v.capacity,
  seats: v.seats, bags: v.bags, image: v.image, tagline: v.tagline,
  features: v.features, icon: v.icon, active: v.active, sortOrder: v.sortOrder,
  ...(withFare ? { fare: v.fare } : {}),
});

export const listFleet = async ({ includeInactive = false, withFare = false } = {}) => {
  const q = includeInactive ? {} : { active: true };
  const rows = await FleetVehicle.find(q).sort({ sortOrder: 1, label: 1 }).lean();
  let usage = null;
  if (includeInactive) {
    // Lets the admin UI explain up-front why a class cannot be deleted or renamed.
    const [rideCounts, driverCounts] = await Promise.all([
      Ride.aggregate([{ $group: { _id: '$vehicleType', n: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$driverDetails.vehicleType', n: { $sum: 1 } } }]),
    ]);
    const rides = Object.fromEntries(rideCounts.map((r) => [r._id, r.n]));
    const drivers = Object.fromEntries(driverCounts.filter((d) => d._id).map((d) => [d._id, d.n]));
    usage = { rides, drivers };
  }
  return rows.map((v) => {
    const out = publicFleet(v, { withFare });
    if (usage) out.usage = { rides: usage.rides[v.key] || 0, drivers: usage.drivers[v.key] || 0 };
    return out;
  });
};

export const getFleetClass = async (key) => FleetVehicle.findOne({ key: String(key || '').toLowerCase() }).lean();

// Keeps estimates working for a class that was deleted or renamed after a ride
// was booked — falls back to the economy rate so a fare is never NaN.
export const FALLBACK_FARE = { base: 3, perKm: 1.4, perMin: 0.3 };

export const assertVehicleKey = async (key) => {
  const k = String(key || '').trim().toLowerCase();
  if (!k) throw fail('Choose a vehicle', 400);
  const doc = await getFleetClass(k);
  if (!doc) throw fail(`Unknown vehicle "${k}" — add it to the fleet first`, 400);
  if (!doc.active) throw fail(`"${doc.label}" is no longer available for booking`, 400);
  return doc;
};

const VEHICLE_FIELDS = ['label', 'desc', 'capacity', 'image', 'tagline', 'icon', 'active'];

export const createVehicle = async (body = {}) => {
  const key = normalise(body.key);
  if (!key) throw fail('Vehicle key is required (e.g. luxury-suv)', 400);
  if (!body.label?.trim()) throw fail('Vehicle label is required', 400);
  if (await FleetVehicle.exists({ key })) throw fail(`A vehicle with key "${key}" already exists`, 409);

  const last = await FleetVehicle.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  const doc = await FleetVehicle.create({
    key,
    label: body.label.trim(),
    desc: body.desc || '',
    capacity: body.capacity || '',
    seats: body.seats ?? 4,
    bags: body.bags ?? 2,
    image: body.image || '',
    tagline: body.tagline || '',
    features: Array.isArray(body.features) ? body.features.filter(Boolean).map(String) : [],
    icon: body.icon || 'car',
    fare: {
      base: body.fare?.base ?? 3,
      perKm: body.fare?.perKm ?? 1.4,
      perMin: body.fare?.perMin ?? 0.3,
    },
    active: body.active !== false,
    sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 0),
  });
  return publicFleet(doc, { withFare: true });
};

export const updateVehicle = async (id, body = {}) => {
  const doc = await FleetVehicle.findById(id);
  if (!doc) throw fail('Vehicle not found', 404);

  if (body.key !== undefined) {
    const key = normalise(body.key);
    if (!key) throw fail('Vehicle key is required', 400);
    if (key !== doc.key) {
      if (await FleetVehicle.exists({ key })) throw fail(`A vehicle with key "${key}" already exists`, 409);
      // Renaming would orphan every ride and driver pointing at the old key.
      const inUse = await Promise.all([
        Ride.countDocuments({ vehicleType: doc.key }),
        User.countDocuments({ 'driverDetails.vehicleType': doc.key }),
      ]);
      if (inUse.some((n) => n > 0)) {
        throw fail(
          `"${doc.label}" is used by ${inUse.join(' ride(s) / ')} driver record(s) and cannot be renamed — add a new vehicle instead.`,
          409
        );
      }
      doc.key = key;
    }
  }

  for (const f of VEHICLE_FIELDS) if (body[f] !== undefined) doc[f] = body[f];
  if (body.seats !== undefined) doc.seats = body.seats;
  if (body.bags !== undefined) doc.bags = body.bags;
  if (body.features !== undefined) {
    doc.features = (Array.isArray(body.features) ? body.features : [])
      .map((f) => String(f).trim())
      .filter(Boolean);
  }
  if (body.fare) {
    for (const k of ['base', 'perKm', 'perMin']) {
      if (body.fare[k] !== undefined) doc.fare[k] = body.fare[k];
    }
  }
  if (body.sortOrder !== undefined) doc.sortOrder = body.sortOrder;

  await doc.save();
  return publicFleet(doc, { withFare: true });
};

export const deleteVehicle = async (id) => {
  const doc = await FleetVehicle.findById(id);
  if (!doc) throw fail('Vehicle not found', 404);

  const [rides, drivers] = await Promise.all([
    Ride.countDocuments({ vehicleType: doc.key }),
    User.countDocuments({ 'driverDetails.vehicleType': doc.key }),
  ]);
  if (rides || drivers) {
    throw fail(
      `"${doc.label}" is used by ${rides} ride(s) and ${drivers} driver(s). Deactivate it instead of deleting.`,
      409
    );
  }
  await doc.deleteOne();
  return { success: true, key: doc.key };
};

// Upserts any *missing* default class without touching rows an admin has
// edited — the escape hatch when someone deletes something they did not mean to.
export const restoreFleetDefaults = async () => {
  const existing = new Set((await FleetVehicle.find().select('key').lean()).map((v) => v.key));
  const missing = FLEET_DEFAULTS.filter((d) => !existing.has(d.key));
  if (missing.length) {
    const last = await FleetVehicle.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    let order = last ? last.sortOrder + 1 : 0;
    await FleetVehicle.insertMany(
      missing.map((m) => ({ ...m, sortOrder: order++, active: true }))
    );
  }
  return { restored: missing.length, vehicles: await listFleet({ includeInactive: true, withFare: true }) };
};

export const reorderFleet = async (ids = []) => {
  await Promise.all(
    ids.map((id, i) => FleetVehicle.findByIdAndUpdate(id, { sortOrder: i }).catch(() => null))
  );
  return listFleet({ includeInactive: true, withFare: true });
};

// -------------------------------------------------------------- services
const publicService = (s) => ({
  _id: s._id,
  slug: s.slug, name: s.name, short: s.short, tagline: s.tagline,
  summary: s.summary, features: s.features, icon: s.icon,
  featured: s.featured, active: s.active, sortOrder: s.sortOrder,
});

export const listServices = async ({ includeInactive = false } = {}) => {
  const q = includeInactive ? {} : { active: true };
  const rows = await ServiceOffering.find(q).sort({ sortOrder: 1, name: 1 }).lean();
  if (!includeInactive) return rows.map(publicService);
  const counts = await Ride.aggregate([
    { $match: { serviceType: { $nin: ['', null] } } },
    { $group: { _id: '$serviceType', n: { $sum: 1 } } },
  ]);
  const used = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  return rows.map((s) => ({ ...publicService(s), usage: { rides: used[s.slug] || 0 } }));
};

export const getServiceBySlug = async (slug) =>
  ServiceOffering.findOne({ slug: String(slug || '').toLowerCase() }).lean();

export const assertServiceSlug = async (slug) => {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null; // serviceType is optional on a ride
  const doc = await getServiceBySlug(s);
  if (!doc) throw fail(`Unknown service "${s}"`, 400);
  return doc;
};

const SERVICE_FIELDS = ['name', 'short', 'tagline', 'summary', 'icon', 'featured', 'active'];

export const createService = async (body = {}) => {
  const slug = normalise(body.slug || body.name);
  if (!slug) throw fail('Service name is required', 400);
  if (!body.name?.trim()) throw fail('Service name is required', 400);
  if (await ServiceOffering.exists({ slug })) throw fail(`A service with slug "${slug}" already exists`, 409);

  const last = await ServiceOffering.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  const doc = await ServiceOffering.create({
    slug,
    name: body.name.trim(),
    short: body.short || '',
    tagline: body.tagline || '',
    summary: body.summary || '',
    features: Array.isArray(body.features) ? body.features.filter(Boolean).map(String) : [],
    icon: body.icon || 'car',
    featured: Boolean(body.featured),
    active: body.active !== false,
    sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 0),
  });
  return publicService(doc);
};

export const updateService = async (id, body = {}) => {
  const doc = await ServiceOffering.findById(id);
  if (!doc) throw fail('Service not found', 404);

  if (body.slug !== undefined) {
    const slug = normalise(body.slug);
    if (!slug) throw fail('Service slug is required', 400);
    if (slug !== doc.slug) {
      if (await ServiceOffering.exists({ slug })) throw fail(`A service with slug "${slug}" already exists`, 409);
      const used = await Ride.countDocuments({ serviceType: doc.slug });
      if (used > 0) {
        throw fail(`"${doc.name}" is used by ${used} ride(s) and cannot be renamed.`, 409);
      }
      doc.slug = slug;
    }
  }

  for (const f of SERVICE_FIELDS) if (body[f] !== undefined) doc[f] = body[f];
  if (body.features !== undefined) {
    doc.features = (Array.isArray(body.features) ? body.features : [])
      .map((f) => String(f).trim())
      .filter(Boolean);
  }
  if (body.sortOrder !== undefined) doc.sortOrder = body.sortOrder;

  await doc.save();
  return publicService(doc);
};

export const deleteService = async (id) => {
  const doc = await ServiceOffering.findById(id);
  if (!doc) throw fail('Service not found', 404);
  const used = await Ride.countDocuments({ serviceType: doc.slug });
  if (used > 0) {
    throw fail(`"${doc.name}" is used by ${used} ride(s). Deactivate it instead of deleting.`, 409);
  }
  await doc.deleteOne();
  return { success: true, slug: doc.slug };
};

export const restoreServiceDefaults = async () => {
  const existing = new Set((await ServiceOffering.find().select('slug').lean()).map((s) => s.slug));
  const missing = SERVICE_DEFAULTS.filter((d) => !existing.has(d.slug));
  if (missing.length) {
    const last = await ServiceOffering.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    let order = last ? last.sortOrder + 1 : 0;
    await ServiceOffering.insertMany(
      missing.map((m) => ({ ...m, sortOrder: order++, active: true }))
    );
  }
  return { restored: missing.length, services: await listServices({ includeInactive: true }) };
};

export const reorderServices = async (ids = []) => {
  await Promise.all(
    ids.map((id, i) => ServiceOffering.findByIdAndUpdate(id, { sortOrder: i }).catch(() => null))
  );
  return listServices({ includeInactive: true });
};
