import { Router } from 'express';
import { CategoriesController, TagsController } from '../controllers/categories.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  idParamSchema,
  createCategorySchema,
  updateCategorySchema,
  createTagSchema,
  updateTagSchema,
} from '../schemas';
import {
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);
categoriesRouter.use(authenticatedIpLimiter, authenticatedUserLimiter);

categoriesRouter.get('/', CategoriesController.listCategories);
categoriesRouter.post('/', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ body: createCategorySchema }), CategoriesController.createCategory);
categoriesRouter.put('/:id', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema, body: updateCategorySchema }), CategoriesController.updateCategory);
categoriesRouter.delete('/:id', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), CategoriesController.deleteCategory);

export const tagsRouter = Router();
tagsRouter.use(authenticate);
tagsRouter.use(authenticatedIpLimiter, authenticatedUserLimiter);

tagsRouter.get('/', TagsController.listTags);
tagsRouter.post('/', requireRole('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY'), validate({ body: createTagSchema }), TagsController.createTag);
tagsRouter.put('/:id', requireRole('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY'), validate({ params: idParamSchema, body: updateTagSchema }), TagsController.updateTag);
tagsRouter.delete('/:id', requireRole('SUPER_ADMIN', 'DEPT_ADMIN'), validate({ params: idParamSchema }), TagsController.deleteTag);
