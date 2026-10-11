import { Buffer } from 'node:buffer';
import User from '../models/User.js';

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

// Only allow editable profile fields.
const EDITABLE = ['name', 'phone'];

// Fleet vehicle ids — must match data/vehicles.js in both clients.
const VEHICLE_TYPES = [
  'executive-sedan', 'economy-sedan', 'economy-suv', 'premium-suv',
  'luxury-suv', 'van', 'mini-coach', 'school-bus', 'motorcoach',
];

const DOCUMENT_KINDS = ['license', 'insurance', 'registration', 'inspection'];

const IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp);base64,/;
const MAX_IMAGE_BYTES = 512 * 1024;

const assertImage = (dataUrl, label) => {
  if (typeof dataUrl !== 'string' || !IMAGE_RE.test(dataUrl)) {
    throw fail(`${label} must be a valid image (PNG/JPEG/GIF/WebP) as a data URL`, 400);
  }
  if (Buffer.from(dataUrl.split(',')[1], 'base64').length > MAX_IMAGE_BYTES) {
    throw fail(`${label} must be under 512KB`, 400);
  }
};

export const publicProfile = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  emailVerified: user.emailVerified,
  authProvider: user.authProvider,
  driverDetails: user.driverDetails,
  passengerProfile: user.passengerProfile || null,
  createdAt: user.createdAt,
});

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw fail('User not found', 404);
  return publicProfile(user);
};

export const updateProfile = async (userId, body) => {
  const update = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) update[field] = String(body[field]).trim();
  }
  if (update.name && !update.name) throw fail('Name cannot be empty', 400);
  if (!Object.keys(update).length) throw fail('Nothing to update', 400);

  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) throw fail('User not found', 404);
  return publicProfile(user);
};

// Avatars are stored as a data-URL (base64) in Mongo — no external storage.
// Validate it's a real image and keep it small enough for a 1mb JSON limit.
const AVATAR_MAX_BYTES = 512 * 1024;

export const setAvatar = async (userId, dataUrl) => {
  if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpe?g|gif|webp);base64,/.test(dataUrl)) {
    throw fail('Provide a valid image (PNG/JPEG/GIF/WebP) as a data URL', 400);
  }
  const base64 = dataUrl.split(',')[1];
  const bytes = Buffer.from(base64, 'base64').length;
  if (bytes > AVATAR_MAX_BYTES) throw fail('Image must be under 512KB', 400);

  const user = await User.findByIdAndUpdate(userId, { avatar: dataUrl }, { new: true });
  if (!user) throw fail('User not found', 404);
  return publicProfile(user);
};

export const removeAvatar = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { avatar: '' }, { new: true });
  if (!user) throw fail('User not found', 404);
  return publicProfile(user);
};

// Change password: verify the current one, then update. Keeps the current
// session — full sign-out-everywhere is handled by the reset-password flow.
export const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword) throw fail('Enter your current password', 400);
  if (!newPassword || newPassword.length < 6) {
    throw fail('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) throw fail('User not found', 404);
  if (!(await user.matchPassword(currentPassword))) {
    throw fail('Current password is incorrect', 400);
  }
  if (await user.matchPassword(newPassword)) {
    throw fail('New password must be different from the current one', 400);
  }

  user.password = newPassword;
  await user.save();
  return { success: true };
};

// ---- Driver onboarding ----------------------------------------------------
//
// A driver submits vehicle details plus documents. Submitting moves the
// account to 'pending' so an admin can review it; the driver is not bookable
// until an admin sets 'verified'.

export const getDriverDetails = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw fail('User not found', 404);
  return {
    vehicleType: user.driverDetails?.vehicleType || '',
    plateNumber: user.driverDetails?.plateNumber || '',
    licenseNo: user.driverDetails?.licenseNo || '',
    verificationStatus: user.driverDetails?.verificationStatus || 'none',
    verificationNote: user.driverDetails?.verificationNote || '',
    verificationSubmittedAt: user.driverDetails?.verificationSubmittedAt || null,
    verificationReviewedAt: user.driverDetails?.verificationReviewedAt || null,
    documents: (user.driverDetails?.documents || []).map((d) => ({
      kind: d.kind,
      status: d.status,
      uploadedAt: d.uploadedAt,
    })),
  };
};

export const updateDriverDetails = async (userId, body = {}) => {
  const user = await User.findById(userId);
  if (!user) throw fail('User not found', 404);
  if (user.role !== 'driver') throw fail('Only drivers can submit vehicle details', 403);

  const d = user.driverDetails || {};

  if (body.vehicleType !== undefined) {
    const v = String(body.vehicleType).trim().toLowerCase();
    if (!VEHICLE_TYPES.includes(v)) throw fail('Choose a valid vehicle type', 400);
    d.vehicleType = v;
  }
  if (body.plateNumber !== undefined) {
    d.plateNumber = String(body.plateNumber).trim().toUpperCase().slice(0, 12);
  }
  if (body.licenseNo !== undefined) {
    d.licenseNo = String(body.licenseNo).trim().slice(0, 30);
  }

  // Documents are replaced wholesale so a resubmission drops stale files.
  if (Array.isArray(body.documents)) {
    if (body.documents.length > 6) throw fail('Too many documents', 400);
    d.documents = body.documents.map((doc) => {
      const kind = String(doc.kind || '').trim();
      if (!DOCUMENT_KINDS.includes(kind)) {
        throw fail(`Unknown document kind "${kind}"`, 400);
      }
      assertImage(doc.image, kind);
      return { kind, image: doc.image, uploadedAt: new Date(), status: 'pending' };
    });
  }

  // Any submission (vehicle or documents) puts the account up for review.
  // Re-submitting after a rejection resets the note so the driver gets a clean
  // slate rather than a stale reason.
  if (d.vehicleType || (d.documents && d.documents.length)) {
    d.verificationStatus = 'pending';
    d.verificationSubmittedAt = new Date();
    d.verificationNote = '';
  }

  user.driverDetails = d;
  await user.save();
  return getDriverDetails(userId);
};

// ---- Passenger profile ----------------------------------------------------

export const updatePassengerProfile = async (userId, body = {}) => {
  const user = await User.findById(userId);
  if (!user) throw fail('User not found', 404);

  const p = user.passengerProfile || {};

  if (body.preferredPayment !== undefined) {
    const m = String(body.preferredPayment).trim().toLowerCase();
    if (!['card', 'cash'].includes(m)) throw fail('Preferred payment must be card or cash', 400);
    p.preferredPayment = m;
  }

  for (const key of ['homeAddress', 'workAddress']) {
    if (body[key] !== undefined) {
      const a = body[key] || {};
      p[key] = {
        address: String(a.address || '').trim().slice(0, 200),
        lat: a.lat === undefined || a.lat === null ? null : Number(a.lat),
        lng: a.lng === undefined || a.lng === null ? null : Number(a.lng),
      };
      if ((p[key].lat == null) !== (p[key].lng == null)) {
        throw fail(`${key} needs both lat and lng, or neither`, 400);
      }
    }
  }

  if (body.emergencyContact !== undefined) {
    const e = body.emergencyContact || {};
    p.emergencyContact = {
      name: String(e.name || '').trim().slice(0, 80),
      phone: String(e.phone || '').trim().slice(0, 30),
    };
  }

  user.passengerProfile = p;
  await user.save();
  return publicProfile(user);
};
