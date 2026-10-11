import { Router } from 'express';
import * as content from '../controllers/contentController.js';

// Public, admin-managed website content — no auth needed.
const router = Router();

router.get('/', content.publicContent);

export default router;
