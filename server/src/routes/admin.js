import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import * as admin from '../controllers/adminController.js';
import * as catalogAdmin from '../controllers/catalogAdminController.js';

const router = Router();

router.use(protect, requireRole('admin'));

// Every state change is wrapped in `audit()` so the Audit Log is a real record
// of who changed what — not just the handful of dispatch/ticket routes.
router.get('/analytics', admin.analytics);
router.get('/rides', admin.rides);
router.patch('/rides/:id/driver', audit('rides.assignDriver', { targetType: 'Ride' }), admin.assignDriver);
router.get('/drivers', admin.drivers);
router.patch('/drivers/:id', audit('drivers.update', { targetType: 'User' }), admin.toggleDriver);
router.post('/drivers/:id/verify', audit('drivers.verify', { targetType: 'User' }), admin.verifyDriver);
router.get('/users', admin.users);
router.patch('/users/:id/suspend', audit('users.suspend', { targetType: 'User' }), admin.suspendUser);
router.patch('/users/:id/unsuspend', audit('users.unsuspend', { targetType: 'User' }), admin.unsuspendUser);
router.delete('/users/:id', audit('users.delete', { targetType: 'User' }), admin.deleteUser);
router.get('/payments', admin.payments);
router.get('/settings', admin.settings);
router.get('/content', admin.adminContent);
router.patch('/content', audit('content.update', { targetType: 'SiteContent' }), admin.adminUpdateContent);
router.patch('/settings', audit('settings.update', { targetType: 'Settings' }), admin.updateAppSettings);

// Fleet classes + service offerings (what a passenger can book).
router.get('/fleet', catalogAdmin.fleet);
router.post('/fleet', audit('fleet.createClass', { targetType: 'FleetVehicle' }), catalogAdmin.createVehicle);
router.patch('/fleet/reorder', audit('fleet.reorder', { targetType: 'FleetVehicle' }), catalogAdmin.reorderFleet);
router.post('/fleet/restore-defaults', audit('fleet.restoreDefaults', { targetType: 'FleetVehicle' }), catalogAdmin.restoreFleet);
router.patch('/fleet/:id', audit('fleet.updateClass', { targetType: 'FleetVehicle' }), catalogAdmin.updateVehicle);
router.delete('/fleet/:id', audit('fleet.deleteClass', { targetType: 'FleetVehicle' }), catalogAdmin.deleteVehicle);
router.get('/services', catalogAdmin.services);
router.post('/services', audit('services.create', { targetType: 'ServiceOffering' }), catalogAdmin.createService);
router.patch('/services/reorder', audit('services.reorder', { targetType: 'ServiceOffering' }), catalogAdmin.reorderServices);
router.post('/services/restore-defaults', audit('services.restoreDefaults', { targetType: 'ServiceOffering' }), catalogAdmin.restoreServices);
router.patch('/services/:id', audit('services.update', { targetType: 'ServiceOffering' }), catalogAdmin.updateService);
router.delete('/services/:id', audit('services.delete', { targetType: 'ServiceOffering' }), catalogAdmin.deleteService);

export default router;
