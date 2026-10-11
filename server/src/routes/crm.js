import { Router } from 'express';
import { protect, requireRole, requirePerm } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import * as admin from '../controllers/adminController.js';
import * as crm from '../controllers/crmController.js';

const router = Router();
// Every CRM route needs an elevated role; `requirePerm` then narrows each one
// down to the actions that role is actually allowed to perform.
router.use(protect, requireRole('admin', 'super_admin', 'dispatcher', 'manager', 'finance', 'support'));

// Reuse existing admin analytics but expose under /crm
router.get('/analytics', requirePerm('analytics:read'), admin.analytics);
router.get('/analytics/timeseries', requirePerm('analytics:read'), crm.timeseries);
router.get('/analytics/heatmap', requirePerm('analytics:read'), crm.heatmap);

router.get('/rides', requirePerm('rides:read'), admin.rides);
router.patch('/rides/:id/dispatch', requirePerm('rides:update'), audit('rides.dispatch', { targetType: 'Ride' }), admin.assignDriver);
router.post('/rides/:id/no-show', requirePerm('rides:update'), audit('rides.no_show', { targetType: 'Ride' }), crm.markNoShow);

router.get('/drivers', requirePerm('drivers:read'), admin.drivers);
router.get('/fleet/vehicles', requirePerm('fleet:read'), crm.listVehicles);
router.post('/fleet/vehicles', requirePerm('fleet:write'), audit('fleet.createVehicle', { targetType: 'Vehicle' }), crm.createVehicle);
router.patch('/fleet/vehicles/:id', requirePerm('fleet:write'), audit('fleet.updateVehicle', { targetType: 'Vehicle' }), crm.updateVehicle);

router.get('/passengers', requirePerm('passengers:read'), crm.listPassengers);
router.get('/passengers/:id', requirePerm('passengers:read'), crm.getPassenger);
router.get('/operations/live', requirePerm('map:read'), crm.liveOps);

router.get('/tickets', requirePerm('tickets:read'), crm.listTickets);
router.post('/tickets', requirePerm('tickets:write'), audit('tickets.create', { targetType: 'Ticket' }), crm.createTicket);
router.patch('/tickets/:id', requirePerm('tickets:write'), audit('tickets.update', { targetType: 'Ticket' }), crm.updateTicket);

router.get('/audit', requirePerm('audit:read'), crm.listAudit);

export default router;
