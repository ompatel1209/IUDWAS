import { Router } from 'express';
import { WorkflowInstancesController } from '../controllers/workflow-instances.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  startWorkflowInstanceSchema,
  listWorkflowInstancesQuerySchema,
  workflowInstanceActionSchema,
  workflowInstanceRejectSchema,
  workflowInstanceDelegateSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.post('/',               validate({ body: startWorkflowInstanceSchema }), WorkflowInstancesController.startWorkflow);
router.get('/',                validate({ query: listWorkflowInstancesQuerySchema }), WorkflowInstancesController.listInstances);
router.get('/pending',         WorkflowInstancesController.getPendingApprovals);
router.get('/:id',             validate({ params: idParamSchema }), WorkflowInstancesController.getInstanceById);
router.post('/:id/approve',    validate({ params: idParamSchema, body: workflowInstanceActionSchema }), WorkflowInstancesController.approveStep);
router.post('/:id/reject',     validate({ params: idParamSchema, body: workflowInstanceRejectSchema }), WorkflowInstancesController.rejectStep);
router.post('/:id/delegate',   validate({ params: idParamSchema, body: workflowInstanceDelegateSchema }), WorkflowInstancesController.delegateStep);

export default router;
