import passport from '../config/passport.js';

// Protects routes via the Passport JWT strategy (stateless Bearer token).
// Same 401 shape as before: { code: 'TOKEN_EXPIRED' } lets the client refresh.
export const protect = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const expired = info?.name === 'TokenExpiredError';
      return res.status(401).json({
        message: expired ? 'Token expired' : 'Not authorized, invalid token',
        ...(expired ? { code: 'TOKEN_EXPIRED' } : {}),
      });
    }
    // Suspended accounts are rejected even with a valid token.
    if (user.isSuspended) {
      return res.status(403).json({ message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
    }
    req.user = user;
    next();
  })(req, res, next);

// 'admin' is the legacy spelling of the super-admin tier, so requiring 'admin'
// admits both spellings.
const expandRole = (r) => (r === 'admin' ? ['admin', 'super_admin'] : [r]);

export const requireRole = (...roles) => (req, res, next) => {
  const allowed = new Set(roles.flatMap(expandRole));
  if (!allowed.has(req.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

// Permission matrix for granular CRM access (resource:action). Applied per route
// so a `support` agent cannot dispatch rides, refund payments or edit the fleet.
const MATRIX = {
  super_admin: ['*'],
  admin: ['*'],
  dispatcher: ['rides:*', 'drivers:read', 'drivers:assign', 'map:read', 'passengers:read', 'notifications:read', 'tickets:read', 'tickets:write'],
  manager: ['rides:read', 'rides:update', 'analytics:read', 'drivers:read', 'drivers:write', 'fleet:read', 'fleet:write', 'passengers:read', 'finance:read', 'notifications:read', 'tickets:read', 'tickets:write'],
  finance: ['finance:*', 'rides:read', 'payments:read', 'analytics:read', 'passengers:read'],
  support: ['tickets:*', 'passengers:read', 'rides:read', 'notifications:read', 'notifications:write'],
  driver: ['rides:read_own', 'rides:update_own'],
};

export const requirePerm = (perm) => (req, res, next) => {
  const perms = MATRIX[req.user?.role] || [];
  if (perms.includes('*') || perms.includes(perm) || perms.includes(`${perm.split(':')[0]}:*`)) {
    return next();
  }
  return res.status(403).json({ message: 'Insufficient permissions' });
};