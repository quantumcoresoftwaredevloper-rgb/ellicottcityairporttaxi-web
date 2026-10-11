import { Car, CarFront, Bus, Gem, School } from 'lucide-react';

// Fleet vehicle types shared across booking, tracking, history, and admin.
// Keep ids stable — they are stored on Ride/User and used for driver matching.
//
// These entries are ONLY the offline fallback behind `CatalogContext`: the live
// source of truth is the FleetVehicle collection an admin manages. They must
// therefore mirror FLEET_DEFAULTS in server/src/services/catalogService.js —
// `capacity`, `seats`, `bags`, `image`, `tagline` and `features` included.
//
// That mirroring has now been wrong twice, and each time it broke the Fleet
// page on a deployed site where the API was unreachable:
//   1. `seats: 4` + `image: ''` for every class -> no photos, and a Van
//      claiming 4 seats.
//   2. `tagline: ''` + `features: []` -> the photos and "Book now" rendered but
//      every description and feature list silently disappeared.
//
// A hand-copied list cannot be trusted, so `npm run check:catalog` diffs this
// file against the server defaults field by field and fails on any drift. Run
// it after editing either side.
export const VEHICLES = [
  {
    id: 'executive-sedan', label: 'Executive Sedan', desc: 'Up to 4 riders',
    capacity: '1–4 passengers', seats: 4, bags: 2, icon: Car,
    image: '/images/ececutive-sedan.png',
    tagline: 'Late-model, "all black" sedan',
    features: [
      'Seats up to 4 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'economy-sedan', label: 'Economy Sedan', desc: 'Up to 4 riders',
    capacity: '1–4 passengers', seats: 4, bags: 2, icon: Car,
    image: '/images/economy-sedan.png',
    tagline: 'Everyday rides and airport runs',
    features: [
      'Seats up to 4 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'economy-suv', label: 'Economy SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 3, icon: CarFront,
    image: '/images/economy-suv.png',
    tagline: 'Late-model, "all black" SUV',
    features: [
      'Seats up to 6 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'premium-suv', label: 'Premium SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 3, icon: CarFront,
    image: '/images/premium-suv.png',
    tagline: 'Roomier SUV with extra luggage space',
    features: [
      'Seats up to 6 comfortably', 'Leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'luxury-suv', label: 'Luxury SUV', desc: 'Up to 6 riders',
    capacity: '4–6 passengers', seats: 6, bags: 4, icon: Gem,
    image: '/images/luxury-suv.png',
    tagline: 'Top-of-fleet SUV for executives and families',
    features: [
      'Seats up to 6 comfortably', 'Premium leather interior', 'AM/FM & Sirius radio',
      'Complimentary water', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'van', label: 'Van', desc: 'Up to 14 riders',
    capacity: '10–14 passengers', seats: 14, bags: 8, icon: Bus,
    image: '/images/Van.png',
    tagline: 'Space for groups & luggage',
    features: [
      'Seats up to 14 without luggage', 'Seats 9 with luggage',
      'Bench seating', 'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'mini-coach', label: 'Mini-Coach', desc: 'Up to 32 riders',
    capacity: '25–32 passengers', seats: 32, bags: 16, icon: Bus,
    image: '/images/mini-coach.png',
    tagline: 'Groups of every size',
    features: [
      'Seats up to 32 passengers', 'Additional luggage space', 'Forward seating',
      'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'school-bus', label: 'School Bus', desc: 'Up to 48 riders',
    capacity: '42–48 passengers', seats: 48, bags: 0, icon: School,
    image: '/images/School-bus.png',
    tagline: 'Safe routes & field trips',
    features: [
      'Seats 42 to 48 passengers', 'Bench seating', 'Air conditioning upon request',
      'Large, manual-opening windows', 'Professional chauffeur in uniform',
    ],
  },
  {
    id: 'motorcoach', label: 'Motorcoach', desc: 'Up to 56 riders',
    capacity: '50–56 passengers', seats: 56, bags: 30, icon: Bus,
    image: '/images/Motorcoach.png',
    tagline: 'Long-haul group travel',
    features: [
      'Seats up to 56 passengers', 'Restroom on board', 'DVD & entertainment',
      'Overhead luggage bins', 'Large under-vehicle luggage area',
      'Air conditioning', 'Professional chauffeur in uniform',
    ],
  },
];

export const vehicleLabel = (id) =>
  VEHICLES.find((v) => v.id === id)?.label || (id || '').replace(/-/g, ' ');
