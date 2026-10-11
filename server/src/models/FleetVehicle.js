import mongoose from 'mongoose';

// A fleet *class* (e.g. "Executive Sedan") that a passenger can book and a
// driver can drive. `key` is the value stored on Ride.vehicleType and
// User.driverDetails.vehicleType, so it is the join key across the app.
//
// This collection is the source of truth: the Mongoose enums on Ride/User/Vehicle
// were relaxed to plain strings so admins can add classes without a redeploy.
// Writes are validated against this collection instead (catalogService.assertVehicleKey).

const fleetVehicleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'],
    },
    label: { type: String, required: true, trim: true },

    // Short line for the booking dropdown ("Up to 4 riders").
    desc: { type: String, default: '' },
    // Short line for the marketing fleet card ("1–4 passengers").
    capacity: { type: String, default: '' },

    seats: { type: Number, default: 4, min: 1, max: 200 },
    bags: { type: Number, default: 2, min: 0, max: 200 },

    image: { type: String, default: '' },
    tagline: { type: String, default: '' },
    features: { type: [String], default: [] },

    // Icon *name* resolved to a component client-side (a React component cannot
    // be stored). One of the names in client/src/lib/iconMap.js.
    icon: { type: String, default: 'car' },

    // Per-class fare. Admin Settings overrides (baseFare/perKm/perMin) still win
    // when set; clear them to use these.
    fare: {
      base: { type: Number, default: 3, min: 0 },
      perKm: { type: Number, default: 1.4, min: 0 },
      perMin: { type: Number, default: 0.3, min: 0 },
    },

    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

fleetVehicleSchema.index({ active: 1, sortOrder: 1 });

export default mongoose.model('FleetVehicle', fleetVehicleSchema);
