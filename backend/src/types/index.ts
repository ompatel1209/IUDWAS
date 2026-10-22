export type UserRole = 'SUPER_ADMIN' | 'DEPT_ADMIN' | 'FACULTY' | 'STUDENT';

export type UserStatus = 'active' | 'inactive';

export type DocumentType = 'pdf' | 'docx' | 'image' | 'excel' | 'other';

export type DocumentStatus = 'draft' | 'active' | 'archived' | 'deleted';

export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';

export type NotificationType = 'in_app' | 'email' | 'sms';

export interface User {
  user_id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string;
  employee_id: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  department_id: string;
  name: string;
  code: string;
  head_user_id: string | null;
  head_user_name?: string;
  parent_dept_id: string | null;
  parent_dept_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  document_id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_type: DocumentType;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploader_name?: string;
  department_id: string | null;
  department_name?: string;
  category_id: string | null;
  category_name?: string;
  category_color?: string;
  ocr_text: string | null;
  is_confidential: boolean;
  version: number;
  status: DocumentStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  versions?: DocumentVersion[];
}

export interface DocumentVersion {
  version_id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  uploader_name?: string;
  change_description: string;
  created_at: string;
}

export interface DocCategory {
  category_id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Tag {
  tag_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface WorkflowTemplate {
  workflow_id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  department_name?: string;
  created_by: string;
  creator_name?: string;
  is_active: boolean;
  max_days_sla: number;
  auto_escalate: boolean;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  step_id: string;
  workflow_id: string;
  step_order: number;
  step_name: string;
  approver_role: UserRole;
  approver_user_id: string | null;
  approver_user_name?: string;
  is_parallel: boolean;
  sla_hours: number;
  on_approve_action: string;
  on_reject_action: string;
}

export interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name?: string;
  document_id: string;
  document_title?: string;
  submitted_by: string;
  submitter_name?: string;
  submitter_email?: string;
  current_step_id: string | null;
  current_step_name?: string;
  current_step_order?: number;
  current_approver_role?: UserRole;
  status: WorkflowStatus;
  comments: string | null;
  submitted_at: string;
  completed_at: string | null;
  updated_at: string;
  steps?: WorkflowStep[];
  logs?: WorkflowStepLog[];
}

export interface WorkflowStepLog {
  log_id: string;
  instance_id: string;
  step_id: string | null;
  step_name?: string;
  actor_id: string;
  actor_name?: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'DELEGATE' | 'CANCEL';
  comments: string | null;
  created_at: string;
}

export type NotificationPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT' | 'ANNOUNCEMENT';

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  priority?: NotificationPriority;
  sender_id?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  sender_department_name?: string | null;
  sender_avatar_url?: string | null;
  sender_signature?: string | null;
  related_resource_type: string | null;
  related_resource_id: string | null;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  user_id: string | null;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
  timestamp: string;
}
