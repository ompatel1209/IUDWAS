import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateSettingsSchema } from '../schemas';
import {
  publicReadLimiter,
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// Health endpoint is public — use the moderate public read limiter
router.get('/health', publicReadLimiter, SystemController.getHealth);

// Settings endpoints require authentication (admin-only for writes)
router.get('/settings', authenticate, authenticatedIpLimiter, authenticatedUserLimiter, SystemController.getSettings);
router.put('/settings', authenticate, requireRole('SUPER_ADMIN'), authenticatedIpLimiter, authenticatedUserLimiter, validate({ body: updateSettingsSchema }), SystemController.updateSettings);

export default router;
