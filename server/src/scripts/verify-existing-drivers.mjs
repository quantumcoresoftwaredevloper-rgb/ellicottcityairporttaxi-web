/**
 * One-off migration: mark every existing driver as verified.
 *
 * The driver-verification workflow (feat(users)) made `verificationStatus`
 * default to 'none' and blocked unverified drivers from going online. That is
 * correct for NEW drivers, but every driver who already existed was created
 * before the field existed and is still 'none' — so this change locked them
 * out of the availability toggle on both the website and the app.
 *
 * Run once: `npm run migrate:drivers`
 * Idempotent: only touches drivers that are not already verified.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

await connectDB();

// The field lives under driverDetails, not at the top level.
const result = await User.updateMany(
  { role: 'driver', 'driverDetails.verificationStatus': { $ne: 'verified' } },
  { $set: { 'driverDetails.verificationStatus': 'verified' } }
);

const total = await User.countDocuments({ role: 'driver' });
const verified = await User.countDocuments({ role: 'driver', 'driverDetails.verificationStatus': 'verified' });

console.log(`  updated: ${result.modifiedCount} driver(s)`);
console.log(`  totals: ${verified}/${total} drivers verified`);

// Any driver left unverified is one that registered after the workflow shipped
// and is still awaiting review — that is expected, not an error.
const pending = await User.countDocuments({ role: 'driver', 'driverDetails.verificationStatus': 'pending' });
if (pending) console.log(`  pending review: ${pending} (awaiting admin)`);

await mongoose.disconnect();
process.exit(0);
