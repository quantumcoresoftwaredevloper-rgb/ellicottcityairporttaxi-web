/**
 * Role vocabulary shared by the route guards, the navbar and the CRM shell.
 * Keeping it in one place stops the "guard allows 6 roles but the nav only
 * links `admin`" class of bug, where a dispatcher or finance agent can reach
 * the CRM by URL but has no way to navigate there.
 */

export const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'dispatcher',
  'manager',
  'finance',
  'support',
];

// 'admin' is the legacy spelling of the super-admin tier, so admitting one
// admits the other — this mirrors requireRole() on the server.
export const normalizeRole = (role) => (role === 'admin' ? ['admin', 'super_admin'] : [role]);

export const hasRole = (user, roles) => {
  if (!user?.role) return false;
  const effective = normalizeRole(user.role);
  return roles.some((r) => effective.includes(r));
};

export const isStaff = (user) => hasRole(user, ADMIN_ROLES);
export const isDriver = (user) => user?.role === 'driver';
