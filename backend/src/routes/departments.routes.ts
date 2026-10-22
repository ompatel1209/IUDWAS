import { Router } from 'express';
import { DepartmentsController } from '../controllers/departments.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/',    DepartmentsController.listDepartments);
router.get('/:id', validate({ params: idParamSchema }), DepartmentsController.getDepartmentById);
router.post('/',   requireRole('SUPER_ADMIN'), validate({ body: createDepartmentSchema }), DepartmentsController.createDepartment);
router.put('/:id', requireRole('SUPER_ADMIN'), validate({ params: idParamSchema, body: updateDepartmentSchema }), DepartmentsController.updateDepartment);
router.delete('/:id', requireRole('SUPER_ADMIN'), validate({ params: idParamSchema }), DepartmentsController.deleteDepartment);

export default router;
