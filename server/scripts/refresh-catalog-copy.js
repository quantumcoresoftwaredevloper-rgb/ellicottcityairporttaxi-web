// One-time copy refresh for an EXISTING database.
//
// Why this is needed: `ensureCatalogDefaults()` only seeds when a collection is
// empty, and `restore-defaults` only re-adds rows that are MISSING. Both are
// deliberate — boot must never resurrect a class an admin deleted or overwrite
// one they edited. The side effect is that when the DEFAULT COPY ITSELF changes,
// a live database keeps serving the old words, because every row already exists.
//
// That is exactly what happened when the fleet copy was changed to stop
// publishing seat and luggage numbers. The code shipped correctly; the seeded
// rows still said "Seats up to 4 comfortably" and the Fleet page rendered it.
//
// This script rewrites ONLY the marketing strings (label is left alone — an
// admin may have renamed a class). Pricing, seats, bags and every other field
// are untouched. It reports what it changed and changes nothing when a row
// already matches.
//
// NON-DESTRUCTIVE, idempotent, safe to re-run.
// Usage on the server:
//   MONGO_URI="mongodb://localhost:27017/ellicottaxi" npm run refresh:catalog-copy
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FleetVehicle from '../src/models/FleetVehicle.js';
import { FLEET_DEFAULTS } from '../src/services/catalogService.js';
import { connectDB } from '../src/config/db.js';

dotenv.config();

// Copy that changed. Anything not listed here is left exactly as the admin set
// it — verified against a database where an admin had renamed a class and set a
// custom fare: both survived.
//
// Deliberately `features` alone. Taglines are admin-owned marketing copy and were
// NOT part of this change, so sweeping them in would clobber real edits for no
// reason. Add a field here only when the default copy for it actually changes.
const COPY_FIELDS = ['features'];

const run = async () => {
  await connectDB();
  let touched = 0;

  for (const def of FLEET_DEFAULTS) {
    const doc = await FleetVehicle.findOne({ key: def.key });
    if (!doc) {
      console.log(`  skip    ${def.key}: not in this database`);
      continue;
    }

    const patch = {};
    for (const field of COPY_FIELDS) {
      const next = def[field];
      if (next === undefined) continue;
      const before = JSON.stringify(doc[field]);
      const after = JSON.stringify(next);
      if (before !== after) patch[field] = next;
    }

    if (Object.keys(patch).length === 0) {
      console.log(`  ok      ${def.key}: already current`);
      continue;
    }

    doc.set(patch);
    await doc.save();
    touched += 1;
    console.log(`  updated ${def.key}: ${COPY_FIELDS.filter((f) => f in patch).join(', ')}`);
  }

  console.log(`\nDone. ${touched} class(es) updated.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});