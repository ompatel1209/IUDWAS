import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  adminResetUserPasswordSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

import { avatarUpload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/',                 requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ query: listUsersQuerySchema }), UsersController.listUsers);
router.get('/export/csv',       requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), UsersController.exportUsersCsv);
router.get('/:id',              requireRole('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY'), validate({ params: idParamSchema }), UsersController.getUserById);
router.post('/',                requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ body: createUserSchema }), UsersController.createUser);
router.put('/:id',              requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema, body: updateUserSchema }), UsersController.updateUser);
router.post('/:id/avatar',      requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), avatarUpload.single('avatar'), UsersController.uploadUserAvatar);
router.patch('/:id/toggle-status', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), UsersController.toggleUserStatus);
router.post('/:id/reset-password', requireRole('SUPER_ADMIN'), validate({ params: idParamSchema, body: adminResetUserPasswordSchema }), UsersController.adminResetPassword);
router.delete('/:id',           requireRole('SUPER_ADMIN'), validate({ params: idParamSchema }), UsersController.deleteUser);

export default router;
