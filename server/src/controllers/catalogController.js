import { asyncHandler } from '../middleware/error.js';
import * as catalog from '../services/catalogService.js';

// Public read-only catalog used by the marketing site, the booking form and
// the driver app. Only active entries are exposed.

export const listFleet = asyncHandler(async (req, res) => {
  res.json({ vehicles: await catalog.listFleet() });
});

export const listServices = asyncHandler(async (req, res) => {
  res.json({ services: await catalog.listServices() });
});

export const getService = asyncHandler(async (req, res) => {
  const service = await catalog.getServiceBySlug(req.params.slug);
  if (!service || !service.active) {
    return res.status(404).json({ message: 'Service not found' });
  }
  res.json({ service });
});
