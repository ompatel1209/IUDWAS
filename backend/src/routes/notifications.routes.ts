import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  sendNotificationSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);
router.use(authenticatedIpLimiter, authenticatedUserLimiter);

router.get('/',                 validate({ query: listNotificationsQuerySchema }), NotificationsController.getNotifications);
router.get('/unread-count',    NotificationsController.getUnreadCount);
router.patch('/:id/read',      validate({ params: idParamSchema }), NotificationsController.markAsRead);
router.patch('/mark-all-read', NotificationsController.markAllAsRead);
router.post('/',               requireRole('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY'), validate({ body: sendNotificationSchema }), NotificationsController.sendNotification);

export default router;
