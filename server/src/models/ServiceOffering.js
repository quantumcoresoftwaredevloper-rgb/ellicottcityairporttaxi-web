import mongoose from 'mongoose';

// A bookable *service* (e.g. "Airport Transfers"). `slug` is the join key: it is
// stored on Ride.serviceType and is the /services/:slug route segment.
//
// Icon is stored as a name (see FleetVehicle.icon) because a React component
// cannot be persisted.

const serviceOfferingSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'],
    },
    name: { type: String, required: true, trim: true },
    // Compact label for menus and booking dropdowns ("Airport").
    short: { type: String, default: '' },
    tagline: { type: String, default: '' },
    summary: { type: String, default: '' },
    features: { type: [String], default: [] },
    icon: { type: String, default: 'car' },

    // Highlighted on the Home page and in the nav mega-menu.
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceOfferingSchema.index({ active: 1, sortOrder: 1 });

export default mongoose.model('ServiceOffering', serviceOfferingSchema);
