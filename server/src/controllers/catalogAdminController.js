import { asyncHandler } from '../middleware/error.js';
import * as catalog from '../services/catalogService.js';

// Admin CRUD for the fleet classes and service offerings. These are the
// marketing-facing catalogs (what a passenger can book), not the physical
// Vehicle records under /api/crm/fleet/vehicles.

export const fleet = asyncHandler(async (req, res) => {
  res.json({ vehicles: await catalog.listFleet({ includeInactive: true, withFare: true }) });
});

export const createVehicle = asyncHandler(async (req, res) => {
  res.status(201).json({ vehicle: await catalog.createVehicle(req.body) });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  res.json({ vehicle: await catalog.updateVehicle(req.params.id, req.body) });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  res.json(await catalog.deleteVehicle(req.params.id));
});

export const restoreFleet = asyncHandler(async (req, res) => {
  res.json(await catalog.restoreFleetDefaults());
});

export const reorderFleet = asyncHandler(async (req, res) => {
  res.json({ vehicles: await catalog.reorderFleet(req.body?.ids) });
});

export const services = asyncHandler(async (req, res) => {
  res.json({ services: await catalog.listServices({ includeInactive: true }) });
});

export const createService = asyncHandler(async (req, res) => {
  res.status(201).json({ service: await catalog.createService(req.body) });
});

export const updateService = asyncHandler(async (req, res) => {
  res.json({ service: await catalog.updateService(req.params.id, req.body) });
});

export const deleteService = asyncHandler(async (req, res) => {
  res.json(await catalog.deleteService(req.params.id));
});

export const restoreServices = asyncHandler(async (req, res) => {
  res.json(await catalog.restoreServiceDefaults());
});

export const reorderServices = asyncHandler(async (req, res) => {
  res.json({ services: await catalog.reorderServices(req.body?.ids) });
});
