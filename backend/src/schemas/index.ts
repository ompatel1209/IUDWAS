import { z } from 'zod';

// ─── Primitive / Reusable Schemas ─────────────────────────────────────────────

export const uuidSchema = z
  .string({ required_error: 'Identifier is required', invalid_type_error: 'Identifier must be a string' })
  .uuid({ message: 'Must be a valid UUID format' });

export const optionalUuidSchema = z
  .string()
  .uuid({ message: 'Must be a valid UUID format' })
  .optional()
  .nullable();

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address format' })
  .max(255, { message: 'Email cannot exceed 255 characters' });

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, { message: 'Password must be at least 6 characters long' })
  .max(128, { message: 'Password cannot exceed 128 characters' });

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'Color must be a valid hex code (e.g. #007AFF)' });

export const idParamSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const roleEnumSchema = z.enum(['SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY', 'STUDENT'], {
  errorMap: () => ({ message: 'Role must be one of: SUPER_ADMIN, DEPT_ADMIN, FACULTY, STUDENT' }),
});

export const documentStatusEnumSchema = z.enum(['draft', 'active', 'archived', 'deleted'], {
  errorMap: () => ({ message: 'Status must be one of: draft, active, archived, deleted' }),
});

// ─── 1. Authentication Schemas ────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    full_name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(100, { message: 'Full name cannot exceed 100 characters' }),
    role: roleEnumSchema.optional().default('STUDENT'),
    department_id: optionalUuidSchema,
    employee_id: z
      .string()
      .trim()
      .max(50, { message: 'Employee/Student ID cannot exceed 50 characters' })
      .optional()
      .nullable(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }).min(1, { message: 'Password is required' }),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(10, { message: 'Invalid refresh token length' })
      .max(4096, { message: 'Refresh token is excessively long' }),
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().max(4096).optional().nullable(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    reset_token: z.string().trim().min(16, 'Reset code from the reset request is required'),
    new_password: passwordSchema,
  })
  .strict();

// ─── 2. Users Schemas ─────────────────────────────────────────────────────────

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().max(100).optional(),
    role: roleEnumSchema.optional(),
    department_id: uuidSchema.optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
    sortBy: z.enum(['full_name', 'email', 'role', 'created_at', 'last_login', 'is_active']).optional(),
    sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  });

export const createUserSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    full_name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(100, { message: 'Full name cannot exceed 100 characters' }),
    role: roleEnumSchema,
    department_id: optionalUuidSchema,
    employee_id: z
      .string()
      .trim()
      .max(50, { message: 'Employee ID cannot exceed 50 characters' })
      .optional()
      .nullable(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    full_name: z.string().trim().min(2).max(100).optional(),
    role: roleEnumSchema.optional(),
    department_id: optionalUuidSchema,
    employee_id: z.string().trim().max(50).optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const adminResetUserPasswordSchema = z
  .object({
    new_password: passwordSchema,
  })
  .strict();

// ─── 3. Departments Schemas ───────────────────────────────────────────────────

export const createDepartmentSchema = z
  .object({
    name: z
      .string({ required_error: 'Department name is required' })
      .trim()
      .min(2, { message: 'Department name must be at least 2 characters' })
      .max(100, { message: 'Department name cannot exceed 100 characters' }),
    code: z
      .string({ required_error: 'Department code is required' })
      .trim()
      .min(2, { message: 'Department code must be at least 2 characters' })
      .max(20, { message: 'Department code cannot exceed 20 characters' })
      .regex(/^[A-Za-z0-9_-]+$/, { message: 'Department code may only contain alphanumeric characters, hyphens, and underscores' }),
    head_user_id: optionalUuidSchema,
    parent_dept_id: optionalUuidSchema,
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z0-9_-]+$/, { message: 'Department code may only contain alphanumeric characters, hyphens, and underscores' })
      .optional(),
    head_user_id: optionalUuidSchema,
    parent_dept_id: optionalUuidSchema,
    is_active: z.boolean().optional(),
  })
  .strict();

// ─── 4. Categories & Tags Schemas ─────────────────────────────────────────────

export const createCategorySchema = z
  .object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(2, { message: 'Category name must be at least 2 characters' })
      .max(100, { message: 'Category name cannot exceed 100 characters' }),
    code: z
      .string({ required_error: 'Category code is required' })
      .trim()
      .min(2, { message: 'Category code must be at least 2 characters' })
      .max(30, { message: 'Category code cannot exceed 30 characters' })
      .regex(/^[A-Za-z0-9_-]+$/, { message: 'Code must be alphanumeric' }),
    color: hexColorSchema.optional().default('#007AFF'),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/).optional(),
    color: hexColorSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const createTagSchema = z
  .object({
    name: z
      .string({ required_error: 'Tag name is required' })
      .trim()
      .min(1, { message: 'Tag name cannot be empty' })
      .max(50, { message: 'Tag name cannot exceed 50 characters' }),
    color: hexColorSchema.optional().default('#5856D6'),
  })
  .strict();

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: hexColorSchema.optional(),
  })
  .strict();

// ─── 5. Documents Schemas ─────────────────────────────────────────────────────

export const listDocumentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().max(100).optional(),
    category_id: uuidSchema.optional(),
    department_id: uuidSchema.optional(),
    status: z.enum(['draft', 'active', 'archived', 'deleted', 'all']).optional(),
    uploaded_by: uuidSchema.optional(),
    sortBy: z.enum(['title', 'file_size', 'created_at', 'updated_at', 'version', 'status']).optional(),
    sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  });

export const updateDocumentMetadataSchema = z
  .object({
    title: z.string().trim().min(1, { message: 'Title cannot be empty' }).max(255).optional(),
    category_id: optionalUuidSchema,
    department_id: optionalUuidSchema,
    is_confidential: z.boolean().optional(),
    status: documentStatusEnumSchema.optional(),
    tags: z.union([z.array(uuidSchema), z.string()]).optional(),
  })
  .strict();

export const uploadVersionBodySchema = z
  .object({
    change_description: z
      .string({ required_error: 'Change description is required' })
      .trim()
      .min(1, { message: 'Change description is required' })
      .max(500, { message: 'Change description cannot exceed 500 characters' }),
  });

export const shareDocumentSchema = z
  .object({
    recipient_email: emailSchema,
    message: z.string().trim().max(500).optional(),
  })
  .strict();

export const documentVersionDownloadParamSchema = z
  .object({
    id: uuidSchema,
    versionNumber: z.coerce.number().int().min(1, { message: 'Version number must be a positive integer' }),
  })
  .strict();

// ─── 6. Workflows & Instances Schemas ─────────────────────────────────────────

export const workflowStepInputSchema = z
  .object({
    step_name: z
      .string({ required_error: 'Step name is required' })
      .trim()
      .min(2, { message: 'Step name must be at least 2 characters' })
      .max(100, { message: 'Step name cannot exceed 100 characters' }),
    approver_role: roleEnumSchema,
    approver_user_id: optionalUuidSchema,
    sla_hours: z.coerce.number().int().min(1).max(720).optional().default(48),
    is_parallel: z.boolean().optional().default(false),
  });

export const createWorkflowSchema = z
  .object({
    name: z
      .string({ required_error: 'Workflow template name is required' })
      .trim()
      .min(2, { message: 'Workflow name must be at least 2 characters' })
      .max(150, { message: 'Workflow name cannot exceed 150 characters' }),
    description: z.string().trim().max(1000).optional().nullable(),
    department_id: optionalUuidSchema,
    max_days_sla: z.coerce.number().int().min(1).max(365).optional().default(5),
    auto_escalate: z.boolean().optional().default(true),
    steps: z
      .array(workflowStepInputSchema, { required_error: 'Approval steps array is required' })
      .min(1, { message: 'A workflow template must contain at least 1 approval step' })
      .max(15, { message: 'Workflows are capped at a maximum of 15 sequential steps' }),
  })
  .strict();

export const updateWorkflowSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    department_id: optionalUuidSchema,
    max_days_sla: z.coerce.number().int().min(1).max(365).optional(),
    auto_escalate: z.boolean().optional(),
    is_active: z.boolean().optional(),
    steps: z.array(workflowStepInputSchema).min(1).max(15).optional(),
  })
  .strict();

export const startWorkflowInstanceSchema = z
  .object({
    workflow_id: uuidSchema,
    document_id: uuidSchema,
    comments: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const workflowInstanceActionSchema = z
  .object({
    comments: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const workflowInstanceRejectSchema = z
  .object({
    comments: z
      .string({ required_error: 'Reason for rejection is required' })
      .trim()
      .min(1, { message: 'A justification comment is required when rejecting a workflow' })
      .max(1000, { message: 'Rejection reason cannot exceed 1000 characters' }),
  })
  .strict();

export const workflowInstanceDelegateSchema = z
  .object({
    delegate_user_id: uuidSchema,
    comments: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const listWorkflowInstancesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'cancelled']).optional(),
    workflow_id: uuidSchema.optional(),
    scope: z.enum(['mine', 'all']).optional(),
  });

// ─── 7. Notifications Schemas ─────────────────────────────────────────────────

export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    unread_only: z.enum(['true', 'false']).optional(),
  });

export const sendNotificationSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    message: z.string().trim().min(5).max(3000),
    type: z.enum(['in_app', 'email', 'sms']).optional().default('in_app'),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT', 'ANNOUNCEMENT']).optional().default('NORMAL'),
    target_type: z.enum(['ALL', 'DEPARTMENT', 'ROLE', 'USER']),
    target_department_id: uuidSchema.optional().nullable(),
    target_role: z.enum(['STUDENT', 'FACULTY', 'DEPT_ADMIN', 'SUPER_ADMIN']).optional().nullable(),
    target_user_id: uuidSchema.optional().nullable(),
    confirm_signature: z.boolean().optional(),
    related_resource_type: z.string().trim().max(100).optional().nullable(),
    related_resource_id: uuidSchema.optional().nullable(),
  })
  .strict();

// ─── 8. Audit Logs Schemas ────────────────────────────────────────────────────

export const listAuditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(100).optional(),
    action: z.string().trim().max(100).optional(),
    user_id: uuidSchema.optional(),
    startDate: z.string().trim().max(50).optional(),
    endDate: z.string().trim().max(50).optional(),
  });

// ─── 9. System Settings Schemas ───────────────────────────────────────────────

export const updateSettingsSchema = z
  .object({
    settings: z
      .record(
        z.string().min(1).max(100),
        z.union([z.string().max(1000), z.number(), z.boolean()])
      ),
  })
  .strict();

// ─── 10. AI / OCR Schemas ─────────────────────────────────────────────────────

export const aiOcrSchema = z
  .object({
    document_id: uuidSchema.optional(),
    text_content: z.string().max(50000, { message: 'Text content cannot exceed 50,000 characters' }).optional(),
  })
  .strict();

export const aiClassifySchema = z
  .object({
    text: z.string().max(50000, { message: 'Text cannot exceed 50,000 characters' }).optional(),
    title: z.string().max(255).optional(),
  })
  .strict();

export const aiSummarizeSchema = z
  .object({
    text: z.string().max(50000, { message: 'Text cannot exceed 50,000 characters' }).optional(),
    document_id: uuidSchema.optional(),
  })
  .strict();

export const aiSearchQuerySchema = z
  .object({
    q: z
      .string({ required_error: 'Query string q is required' })
      .trim()
      .min(1, { message: 'Search term cannot be empty' })
      .max(200, { message: 'Search query cannot exceed 200 characters' }),
  });

export const aiChatbotSchema = z
  .object({
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(1, { message: 'Message cannot be empty' })
      .max(2000, { message: 'Message cannot exceed 2000 characters' }),
    document_context_id: uuidSchema.optional(),
    conversation_history: z.array(z.any()).optional(),
  })
  .strict();

export const aiExtractFieldsSchema = z
  .object({
    text: z.string().max(50000).optional(),
    document_id: uuidSchema.optional(),
  })
  .strict();
