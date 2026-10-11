import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const tokenSubSchema = new mongoose.Schema(
  {
    token: { type: String },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['passenger', 'driver', 'admin', 'super_admin', 'dispatcher', 'manager', 'finance', 'support'], default: 'passenger' },
    avatar: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    // Web-push subscriptions (endpoint + VAPID keys) for browser notifications
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: String,
          auth: String,
        },
      },
    ],
    // Incremented on logout / password reset to invalidate outstanding JWTs
    tokenVersion: { type: Number, default: 1 },
    verificationToken: { type: tokenSubSchema, default: null },
    resetToken: { type: tokenSubSchema, default: null },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'phone'],
      default: 'local',
    },
    driverDetails: {
      // Validated against the FleetVehicle catalog on write (see catalogService).
      vehicleType: { type: String, trim: true, lowercase: true, default: 'economy-sedan' },
      plateNumber: { type: String, default: '' },
      licenseNo: { type: String, default: '' },
      isAvailable: { type: Boolean, default: false },
      // Uber-like driver metrics
      stats: {
        totalRides: { type: Number, default: 0 },
        rating: { type: Number, default: 0 }, // average 0-5
        ratingCount: { type: Number, default: 0 },
        compliments: {
          clean: { type: Number, default: 0 },
          professional: { type: Number, default: 0 },
          friendly: { type: Number, default: 0 },
          safe: { type: Number, default: 0 },
        },
      },

      // Admin verification workflow. A four-state enum, not a boolean: a driver
      // who has submitted documents is 'pending' until an admin acts, and a
      // boolean cannot express that middle state.
      verificationStatus: {
        type: String,
        enum: ['none', 'pending', 'verified', 'rejected'],
        default: 'none',
      },
      verificationSubmittedAt: { type: Date, default: null },
      verificationReviewedAt: { type: Date, default: null },
      verificationReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      verificationNote: { type: String, default: '', maxlength: 500 },

      // Documents captured at onboarding. Stored as data-URLs for now; the
      // object-storage migration (see docs/USER_MANAGEMENT_PLAN.md) moves
      // these to keys without changing the shape.
      documents: [{
        kind: {
          type: String,
          enum: ['license', 'insurance', 'registration', 'inspection'],
          required: true,
        },
        image: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
      }],
    },

    // Passenger-specific detail. Kept separate from driverDetails so neither
    // role carries the other's dead fields.
    passengerProfile: {
      preferredPayment: {
        type: String,
        enum: ['card', 'cash'],
        default: 'card',
      },
      homeAddress: {
        address: { type: String, default: '' },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
      workAddress: {
        address: { type: String, default: '' },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
      emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone }).select('+password');
};

userSchema.statics.findByLogin = function (identifier) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  return isEmail ? this.findByEmail(identifier) : this.findByPhone(identifier);
};

const User = mongoose.model('User', userSchema);
export default User;