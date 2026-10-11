import { Router } from 'express';
import * as catalog from '../controllers/catalogController.js';

// Public catalog (no auth): the fleet and services a passenger can book.
const router = Router();

router.get('/fleet', catalog.listFleet);
router.get('/services', catalog.listServices);
router.get('/services/:slug', catalog.getService);

export default router;
