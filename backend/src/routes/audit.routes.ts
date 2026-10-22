import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  listAuditQuerySchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'DEPT_ADMIN'));
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/', validate({ query: listAuditQuerySchema }), AuditController.getAuditLogs);
router.get('/:id', validate({ params: idParamSchema }), AuditController.getAuditLogById);

export default router;
