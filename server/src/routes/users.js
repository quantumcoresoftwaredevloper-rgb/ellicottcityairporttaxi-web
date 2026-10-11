import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as user from '../controllers/userController.js';

const router = Router();

router.use(protect);

router.get('/me', user.getProfile);
router.patch('/me', user.updateProfile);
router.post('/me/avatar', user.setAvatar);
router.delete('/me/avatar', user.removeAvatar);
router.patch('/me/password', user.changePassword);
router.get('/me/driver-details', user.getDriverDetails);
router.post('/me/driver-details', user.updateDriverDetails);
router.patch('/me/passenger-profile', user.updatePassengerProfile);

export default router;
