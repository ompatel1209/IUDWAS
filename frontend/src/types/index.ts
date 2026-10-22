export type UserRole = 'SUPER_ADMIN' | 'DEPT_ADMIN' | 'FACULTY' | 'STUDENT';

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  employee_id: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Department {
  department_id: string;
  name: string;
  code: string;
  head_user_id: string | null;
  head_user_name?: string;
  head_user_email?: string;
  parent_dept_id: string | null;
  parent_dept_name?: string;
  is_active: boolean;
  created_at: string;
  user_count?: number;
  document_count?: number;
}

export interface Tag {
  tag_id: string;
  name: string;
  color: string;
  document_count?: number;
}

export interface DocCategory {
  category_id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
  document_count?: number;
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

export interface DocumentItem {
  document_id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'image' | 'excel' | 'other';
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploader_name?: string;
  uploader_email?: string;
  department_id: string | null;
  department_name?: string;
  category_id: string | null;
  category_name?: string;
  category_color?: string;
  ocr_text: string | null;
  is_confidential: boolean;
  version: number;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  versions?: DocumentVersion[];
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
  step_count?: number;
  instance_count?: number;
  steps?: WorkflowStep[];
}

export interface WorkflowStepLog {
  log_id: string;
  instance_id: string;
  step_id: string | null;
  step_name?: string;
  actor_id: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: UserRole;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'DELEGATE' | 'CANCEL';
  comments: string | null;
  created_at: string;
}

export interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name?: string;
  workflow_description?: string;
  max_days_sla?: number;
  document_id: string;
  document_title?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  mime_type?: string;
  ocr_text?: string;
  submitted_by: string;
  submitter_name?: string;
  submitter_email?: string;
  current_step_id: string | null;
  current_step_name?: string;
  current_step_order?: number;
  current_approver_role?: UserRole;
  step_sla_hours?: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  comments: string | null;
  submitted_at: string;
  completed_at: string | null;
  updated_at: string;
  steps?: WorkflowStep[];
  logs?: WorkflowStepLog[];
}

export type NotificationPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT' | 'ANNOUNCEMENT';

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: 'email' | 'in_app' | 'sms';
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

export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';

export interface AuditLogItem {
  log_id: string;
  user_id: string | null;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details?: any;
  metadata?: any;
  created_at: string;
}

export type AuditLog = AuditLogItem;

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
