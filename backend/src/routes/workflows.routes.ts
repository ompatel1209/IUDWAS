import { Router } from 'express';
import { WorkflowsController } from '../controllers/workflows.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/',            WorkflowsController.listWorkflows);
router.get('/:id',         validate({ params: idParamSchema }), WorkflowsController.getWorkflowById);
router.post('/',           requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ body: createWorkflowSchema }), WorkflowsController.createWorkflow);
router.put('/:id',         requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema, body: updateWorkflowSchema }), WorkflowsController.updateWorkflow);
router.post('/:id/duplicate', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), WorkflowsController.duplicateWorkflow);
router.delete('/:id',      requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), WorkflowsController.deleteWorkflow);

export default router;
