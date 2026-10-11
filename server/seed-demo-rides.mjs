/**
 * Seed a handful of demo rides for the seeded passenger so the homepage's
 * data-driven cards ("Ride in progress", "Recent") have something to render.
 * Safe to re-run: it only inserts, and is meant for local development.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import Ride from './src/models/Ride.js';

await connectDB();

const passenger = await User.findOne({ email: 'passenger@ridetaxi.com' });
if (!passenger) {
  console.error('  passenger@ridetaxi.com not found — run `npm run seed` first');
  process.exit(1);
}

const now = Date.now();
const DAY = 86400000;

const rides = [
  // One live ride -> the homepage's "Ride in progress" card.
  {
    pickup: { address: 'Ellicott City, Howard County, Maryland, United States', lat: 39.2673, lng: -76.7983 },
    dropoff: { address: 'BWI Airport, 7155, Elm Road, Glen Burnie, MD', lat: 39.1754, lng: -76.6683 },
    vehicleType: 'executive-sedan', serviceType: 'airport',
    passengerCount: 2, bags: 2, status: 'pending',
    fare: { estimated: 67.3, currency: 'USD', distanceKm: 42.1, durationMin: 48 },
    route: [], createdAt: new Date(now - 4 * 60000),
  },
  // Past rides -> the "Recent" rail, each with a distinct pickup.
  {
    pickup: { address: '9009 Main St, Ellicott City, MD 21043', lat: 39.2707, lng: -76.8044 },
    dropoff: { address: 'Reagan National Airport, Arlington, VA', lat: 38.8512, lng: -77.0402 },
    vehicleType: 'luxury-suv', serviceType: 'airport',
    passengerCount: 3, bags: 3, status: 'completed',
    fare: { estimated: 92.15, final: 88.4, currency: 'USD', distanceKm: 58.3, durationMin: 62 },
    route: [], createdAt: new Date(now - 3 * DAY),
  },
  {
    pickup: { address: 'Charles Center, Baltimore, MD 21201', lat: 39.2912, lng: -76.6122 },
    dropoff: { address: 'Ellicott City, Howard County, MD', lat: 39.2673, lng: -76.7983 },
    vehicleType: 'economy-sedan', serviceType: 'corporate',
    passengerCount: 1, bags: 0, status: 'completed',
    fare: { estimated: 41.8, final: 39.95, currency: 'USD', distanceKm: 26.4, durationMin: 34 },
    route: [], createdAt: new Date(now - 6 * DAY),
  },
  {
    pickup: { address: 'Owings Mills Mall, Owings Mills, MD', lat: 39.4062, lng: -76.7944 },
    dropoff: { address: 'Maryland Live!, Baltimore, MD', lat: 39.2861, lng: -76.6831 },
    vehicleType: 'van', serviceType: 'shuttle',
    passengerCount: 8, bags: 4, status: 'cancelled',
    fare: { estimated: 54.2, currency: 'USD', distanceKm: 31.9, durationMin: 40 },
    route: [], createdAt: new Date(now - 9 * DAY),
  },
];

const created = await Ride.insertMany(
  rides.map((r) => ({ ...r, passenger: passenger._id, timestamps: { requested: r.createdAt } }))
);
console.log('  inserted ' + created.length + ' demo rides for ' + passenger.email);
created.forEach((r) => console.log('    ' + r.status.padEnd(10) + (r.pickup.address || '').slice(0, 52)));
console.log('  totals: ' + (await Ride.countDocuments()) + ' rides in the database');
await mongoose.disconnect();
process.exit(0);
