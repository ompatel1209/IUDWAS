import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/admin', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), AnalyticsController.getAdminMetrics);
router.get('/user', AnalyticsController.getUserDashboardMetrics);

export default router;
