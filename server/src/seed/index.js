import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Location from '../models/Location.js';
import AppSetting from '../models/AppSetting.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const users = [
  {
    name: 'Admin',
    email: 'admin@ellicot.com',
    phone: '+1 555 010 0000',
    password: 'admin123',
    role: 'admin',
    emailVerified: true,
  },
  {
    name: 'John Passenger',
    email: 'passenger@ellicot.com',
    phone: '+1 555 010 1000',
    password: 'pass123',
    role: 'passenger',
    emailVerified: true,
  },
  {
    name: 'Driver Alex',
    email: 'alex@ellicot.com',
    phone: '+1 555 010 2001',
    password: 'driver123',
    role: 'driver',
    emailVerified: true,
    driverDetails: {
      vehicleType: 'executive-sedan',
      plateNumber: 'ABC-123',
      licenseNo: 'DL-88213',
      isAvailable: true,
      // Seeded drivers are pre-verified. The verification workflow defaults this
      // to 'none', and setAvailability() returns 403 unless it is 'verified', so
      // without this every seeded driver is locked out of going online and the
      // documented dev flow (seed -> login as alex@...) silently breaks.
      verificationStatus: 'verified',
    },
  },
  {
    name: 'Driver Sam',
    email: 'sam@ellicot.com',
    phone: '+1 555 010 2002',
    password: 'driver123',
    role: 'driver',
    emailVerified: true,
    driverDetails: {
      vehicleType: 'premium-suv',
      plateNumber: 'XYZ-789',
      licenseNo: 'DL-99102',
      isAvailable: true,
      verificationStatus: 'verified',
    },
  },
];

// One domain only: @ellicot.com. This used to seed a second copy of every
// account on @ridetaxi.com so either domain could sign in. That is gone: the
// migration target is @ellicot.com (scripts/migrate-demo-emails.js), so
// seeding the old domain only guaranteed a future rename. It also meant eight
// accounts to keep in step, and a bare phone number had to differ per copy or
// sign-in could not tell them apart.

const seedLocations = async (drivers) => {
  // Howard County, Maryland area
  const spots = [
    { lat: 39.207, lng: -76.857 },
    { lat: 39.213, lng: -76.865 },
    { lat: 39.198, lng: -76.846 },
  ];
  for (let i = 0; i < drivers.length; i++) {
    // Wrap around so the seed never breaks when the driver count exceeds the
    // number of hand-placed spots.
    const spot = spots[i % spots.length];
    await Location.findOneAndUpdate(
      { driver: drivers[i]._id },
      {
        driver: drivers[i]._id,
        coordinates: { type: 'Point', coordinates: [spot.lng, spot.lat] },
        updatedAt: new Date(),
      },
      { upsert: true }
    );
  }
};

const run = async () => {
  await connectDB();
  await User.deleteMany({});
  await Location.deleteMany({});
  await AppSetting.deleteMany({});

  const created = [];
  for (const u of users) {
    const user = await User.create(u);
    created.push(user);
  }

  const drivers = created.filter((u) => u.role === 'driver');
  await seedLocations(drivers);

  // Default app settings (editable from Admin CRM).
  await AppSetting.create([
    { key: 'paymentsEnabled', value: true },
    { key: 'supportPhone', value: '(410) 365-5556' },
    { key: 'supportEmail', value: 'chriskbonsu@gmail.com' },
  ]);

  console.log(`Seed complete (${mongoose.connection.name}):`);
  users.forEach((u) => console.log(`  ${u.role.padEnd(9)} ${u.email} / ${u.password}`));
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});