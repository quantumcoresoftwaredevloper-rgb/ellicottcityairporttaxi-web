import { asyncHandler } from '../middleware/error.js';
import Ride from '../models/Ride.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Location from '../models/Location.js';
import RefreshToken from '../models/RefreshToken.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import * as rideService from '../services/rideService.js';
import { notify } from '../services/notificationService.js';
import { safeRegex, safeInt, safeFilterValue } from '../utils/sanitize.js';

const ioOf = (req) => req.app.get('io');

// GET /api/admin/analytics
export const analytics = asyncHandler(async (req, res) => {
  const [totalRides, activeRides, totalDrivers, totalPassengers, revenue, recentRides] =
    await Promise.all([
      Ride.countDocuments(),
      Ride.countDocuments({ status: { $in: ['pending', 'accepted', 'arriving', 'in_progress'] } }),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'passenger' }),
      Ride.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$fare.final' } } },
      ]),
      Ride.find().sort({ createdAt: -1 }).limit(10).populate('passenger driver', 'name'),
    ]);

  res.json({
    totalRides,
    activeRides,
    totalDrivers,
    totalPassengers,
    revenue: revenue[0]?.total || 0,
    recentRides,
  });
});

// GET /api/admin/rides?status=&page=&limit=
export const rides = asyncHandler(async (req, res) => {
  // `status` is coerced to a primitive: ?status[$ne]=x would otherwise be
  // executed by Mongo as an operator and defeat the filter.
  const status = safeFilterValue(req.query.status);
  const page = safeInt(req.query.page, 1, { min: 1, max: 100000 });
  const limit = safeInt(req.query.limit, 20, { min: 1, max: 100 });
  const query = status ? { status } : {};
  const [rides, total] = await Promise.all([
    Ride.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('passenger driver', 'name phone avatar'),
    Ride.countDocuments(query),
  ]);
  res.json({ rides, total, page, limit });
});

// GET /api/admin/drivers
  export const drivers = asyncHandler(async (req, res) => {
    // ?status=pending|verified|rejected|none filters the review queue.
    const filter = { role: 'driver' };
    const status = safeFilterValue(req.query.status);
    if (status) {
      if (!['none', 'pending', 'verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      filter['driverDetails.verificationStatus'] = status;
    }
    const drivers = await User.find(filter).select('-password');
    res.json({ drivers });
  });

  // PATCH /api/admin/drivers/:id/verify { status: 'verified' | 'rejected', note }
  //
  // Approving makes the driver bookable; rejecting requires a note so the
  // driver knows what to fix. Every decision records who reviewed it and when.
  export const verifyDriver = asyncHandler(async (req, res) => {
    const status = safeFilterValue(req.body.status);
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be verified or rejected' });
    }
    const note = safeFilterValue(req.body.note || '').slice(0, 500);
    if (status === 'rejected' && !note) {
      return res.status(400).json({ message: 'A note is required when rejecting' });
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    if (driver.driverDetails?.verificationStatus === status) {
      return res.status(409).json({ message: `Driver is already ${status}` });
    }

    driver.driverDetails = driver.driverDetails || {};
    driver.driverDetails.verificationStatus = status;
    driver.driverDetails.verificationReviewedAt = new Date();
    driver.driverDetails.verificationReviewedBy = req.user._id;
    driver.driverDetails.verificationNote = note;
    // A rejected driver must not stay on duty.
    if (status === 'rejected') driver.driverDetails.isAvailable = false;
    await driver.save();

    // Tell the driver the outcome.
    await notify({
      user: driver._id,
      type: 'account',
      title: status === 'verified' ? 'You are verified' : 'Verification update',
      message: status === 'verified'
        ? 'Your driver account has been approved. You can now go online.'
        : `Your driver account was not approved. ${note}`,
      io: ioOf(req),
    });

    res.json({ driver });
  });

// PATCH /api/admin/rides/:id/driver { driverId } - assign a driver to a ride,
// or { driverId: null } to remove the assigned driver and return to the board.
export const assignDriver = asyncHandler(async (req, res) => {
  const { ride, removedDriverId } = await rideService.assignDriver(
    req.params.id,
    req.body.driverId ?? null
  );
  const io = ioOf(req);

  io.to(`ride:${ride._id}`).emit('ride:update', { ride, status: ride.status });
  io.to('admins').emit('ride:update', { ride, status: ride.status });

  if (ride.driver) {
    await notify({
      user: ride.passenger._id,
      type: 'ride',
      title: 'Driver assigned',
      message: `${ride.driver.name} has been assigned to your ride.`,
      data: { rideId: ride._id },
      io,
    });
    await notify({
      user: ride.driver._id,
      type: 'ride',
      title: 'New ride assigned',
      message: `Pick up ${ride.passenger.name} at ${ride.pickup.address}.`,
      data: { rideId: ride._id },
      io,
    });
  } else if (removedDriverId) {
    await notify({
      user: ride.passenger._id,
      type: 'ride',
      title: 'Driver reassigned',
      message: 'Your ride is back on the board; dispatch is finding you another driver.',
      data: { rideId: ride._id },
      io,
    });
    await notify({
      user: removedDriverId,
      type: 'ride',
      title: 'Assignment removed',
      message: 'Your assignment to a ride was reassigned by dispatch.',
      data: { rideId: ride._id },
      io,
    });
  }

  res.json({ ride });
});

// PATCH /api/admin/drivers/:id { driverDetails.isAvailable }
export const toggleDriver = asyncHandler(async (req, res) => {
  const driver = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'driver' },
    { 'driverDetails.isAvailable': req.body.isAvailable },
    { new: true }
  );
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  res.json({ driver });
});

// GET /api/admin/users?search=&role=&page=&limit=
export const users = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const role = safeFilterValue(req.query.role) || '';
  const page = safeInt(req.query.page, 1, { min: 1, max: 100000 });
  const limit = safeInt(req.query.limit, 20, { min: 1, max: 100 });
  const query = {};
  if (role) query.role = role;
  if (search) {
    const rx = safeRegex(search);
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);
  res.json({ users, total, page, limit });
});

// PATCH /api/admin/users/:id/suspend
export const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isSuspended: true },
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  // Kick their active refresh sessions so they can't keep using the app.
  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ user });
});

// PATCH /api/admin/users/:id/unsuspend
export const unsuspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isSuspended: false },
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

// DELETE /api/admin/users/:id - permanently deletes a user + their data.
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (['admin', 'super_admin'].includes(user.role)) {
    return res.status(400).json({ message: 'Cannot delete an admin account' });
  }
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  await Promise.all([
    User.deleteOne({ _id: user._id }),
    Location.deleteMany({ driver: user._id }),
    RefreshToken.deleteMany({ user: user._id }),
    Ride.deleteMany({ $or: [{ passenger: user._id }, { driver: user._id }] }),
    Payment.deleteMany({ user: user._id }),
  ]);
  res.json({ success: true });
});

// GET /api/admin/payments?status=&page=&limit=
export const payments = asyncHandler(async (req, res) => {
  const status = safeFilterValue(req.query.status) || '';
  const page = safeInt(req.query.page, 1, { min: 1, max: 100000 });
  const limit = safeInt(req.query.limit, 20, { min: 1, max: 100 });
  const query = status ? { status } : {};
  const [payments, total, summary] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .populate('ride', 'pickup dropoff'),
    Payment.countDocuments(query),
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);
  res.json({
    payments,
    total,
    page,
    limit: +limit,
    summary: Object.fromEntries(summary.map((s) => [s._id, s])),
  });
});

// GET /api/admin/settings
export const settings = asyncHandler(async (req, res) => {
  res.json({ settings: await getSettings() });
});

// PATCH /api/admin/settings
export const updateAppSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await updateSettings(req.body) });
});

// ---- Website content (admin-managed marketing copy) ----
export { adminContent, adminUpdateContent } from './contentController.js';
