import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Ride from '../models/Ride.js';
import User from '../models/User.js';

const STAFF_ROLES = ['admin', 'super_admin', 'dispatcher', 'manager'];

// Wraps an async socket handler so a malformed id or a DB error can never become
// an unhandled rejection (which would take the whole process down).
const guard = (fn) => (payload) => {
  Promise.resolve()
    .then(() => fn(payload))
    .catch((err) => console.error('socket handler failed:', err?.message));
};

const isObjectId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

// Joins every room a user is entitled to and leaves any previously joined ones.
const syncRooms = (socket) => {
  if (!socket.userId) return;
  socket.join(`user:${socket.userId}`);
  if (socket.role === 'driver') socket.join('drivers');
  if (STAFF_ROLES.includes(socket.role)) socket.join('admins');
};

export const initSocket = (io) => {
  // Sockets authenticate with the same short-lived access JWT as the REST API.
  // There is deliberately NO userId/role fallback: accepting client-asserted
  // identity would let anyone join another user's private room or the admin room.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(); // anonymous — public pages need no rooms
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.id).select('role isSuspended tokenVersion');
      if (!user || user.isSuspended || user.tokenVersion !== payload.v) return next(new Error('UNAUTHORIZED'));
      socket.userId = String(user._id);
      socket.role = user.role;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} user:${socket.userId || 'anon'} role:${socket.role || '-'}`);

    // Re-authentication after a token refresh. Only a verifiable JWT is accepted.
    socket.on(
      'authenticate',
      guard(async ({ token } = {}) => {
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id).select('role isSuspended tokenVersion');
        if (!user || user.isSuspended || user.tokenVersion !== decoded.v) return;
        if (socket.userId) {
          socket.leave(`user:${socket.userId}`);
          socket.leave('drivers');
          socket.leave('admins');
        }
        socket.userId = String(user._id);
        socket.role = user.role;
        syncRooms(socket);
      })
    );

    syncRooms(socket);

    // Join a ride-scoped room so passenger + driver share live events. Only the
    // ride's passenger, its assigned driver, or staff may join (location data
    // flows through these rooms, so unauthenticated joins are rejected).
    socket.on(
      'ride:join',
      guard(async ({ rideId } = {}) => {
        if (!rideId || !socket.userId || !isObjectId(rideId)) return;
        const ride = await Ride.findById(rideId).select('passenger driver').lean();
        if (!ride) return;
        const isStaff = STAFF_ROLES.includes(socket.role);
        const isParticipant =
          String(ride.passenger) === String(socket.userId) ||
          (ride.driver && String(ride.driver) === String(socket.userId));
        if (isStaff || isParticipant) socket.join(`ride:${rideId}`);
      })
    );

    // Driver publishes position -> forward to the ride room the driver is serving
    socket.on(
      'driver:location',
      guard(async ({ lat, lng, heading = 0, speed = 0 } = {}) => {
        const driverId = socket.userId;
        if (!driverId || lat == null || lng == null) return;
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

        const activeRide = await Ride.findOne({
          driver: driverId,
          status: { $in: ['accepted', 'arriving', 'in_progress'] },
        })
          .select('_id')
          .lean();

        if (activeRide) {
          io.to(`ride:${activeRide._id}`).emit('driver:location', {
            driverId, lat, lng, heading, speed,
          });
        }
      })
    );

    // Passenger publishes position -> forward to the ride room so the assigned
    // driver can find them live (mirror of driver:location).
    socket.on(
      'passenger:location',
      guard(async ({ lat, lng, heading = 0, speed = 0 } = {}) => {
        const passengerId = socket.userId;
        if (!passengerId || lat == null || lng == null) return;
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

        const activeRide = await Ride.findOne({
          passenger: passengerId,
          status: { $in: ['accepted', 'arriving', 'in_progress'] },
        })
          .select('_id')
          .lean();

        if (activeRide) {
          io.to(`ride:${activeRide._id}`).emit('passenger:location', {
            passengerId, lat, lng, heading, speed,
          });
        }
      })
    );

    // Uber-like live chat: passenger ↔ driver in ride room (only participants)
    socket.on(
      'ride:message',
      guard(async ({ rideId, text } = {}) => {
        if (!rideId || !text || !socket.userId || !isObjectId(rideId)) return;
        const trimmed = String(text).trim().slice(0, 500);
        if (!trimmed) return;
        const ride = await Ride.findById(rideId).select('passenger driver').lean();
        if (!ride) return;
        const isParticipant =
          String(ride.passenger) === String(socket.userId) ||
          (ride.driver && String(ride.driver) === String(socket.userId));
        if (!isParticipant) return;
        const at = new Date();
        await Ride.findByIdAndUpdate(rideId, {
          $push: { messages: { sender: socket.userId, text: trimmed, at } },
        });
        io.to(`ride:${rideId}`).emit('ride:message', {
          rideId, sender: socket.userId, text: trimmed, at, senderRole: socket.role,
        });
      })
    );

    // Removed insecure client-triggered ride:cancel broadcast — cancellations must go via
    // REST POST /api/rides/:id/cancel (validated in rideService.cancelRide)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
