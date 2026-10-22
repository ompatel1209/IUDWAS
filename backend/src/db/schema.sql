-- IUDWAS Database Schema (3rd Normal Form with Relational Integrity)

PRAGMA foreign_keys = ON;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    department_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    head_user_id TEXT,
    parent_dept_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_dept_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY', 'STUDENT')),
    department_id TEXT,
    employee_id TEXT UNIQUE,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- Circular FK for department head
-- (Handled in application / sqlite deferred constraint)

-- 3. Refresh Tokens & Sessions
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Document Categories
CREATE TABLE IF NOT EXISTS doc_categories (
    category_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#007AFF',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Tags
CREATE TABLE IF NOT EXISTS tags (
    tag_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#5856D6',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Documents
CREATE TABLE IF NOT EXISTS documents (
    document_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'image', 'excel', 'other')),
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    department_id TEXT,
    category_id TEXT,
    ocr_text TEXT,
    is_confidential INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'archived', 'deleted')),
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES doc_categories(category_id) ON DELETE SET NULL
);

-- 7. Document Versions (Full history)
CREATE TABLE IF NOT EXISTS document_versions (
    version_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    change_description TEXT NOT NULL DEFAULT 'Initial version',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    UNIQUE(document_id, version_number)
);

-- 8. Document Tags Junction (Many-to-Many)
CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- 9. Workflow Templates
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    department_id TEXT,
    created_by TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    max_days_sla INTEGER NOT NULL DEFAULT 5,
    auto_escalate INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- 10. Workflow Steps
CREATE TABLE IF NOT EXISTS workflow_steps (
    step_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    approver_role TEXT NOT NULL CHECK(approver_role IN ('SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY', 'STUDENT')),
    approver_user_id TEXT,
    is_parallel INTEGER NOT NULL DEFAULT 0,
    sla_hours INTEGER NOT NULL DEFAULT 48,
    on_approve_action TEXT NOT NULL DEFAULT 'NEXT_STEP',
    on_reject_action TEXT NOT NULL DEFAULT 'REJECT_WORKFLOW',
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    FOREIGN KEY (approver_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE(workflow_id, step_order)
);

-- 11. Workflow Instances
CREATE TABLE IF NOT EXISTS workflow_instances (
    instance_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    current_step_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
    comments TEXT,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE RESTRICT,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE RESTRICT,
    FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (current_step_id) REFERENCES workflow_steps(step_id) ON DELETE SET NULL
);

-- 12. Workflow Step Logs / Approvals History
CREATE TABLE IF NOT EXISTS workflow_step_logs (
    log_id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    step_id TEXT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('SUBMIT', 'APPROVE', 'REJECT', 'DELEGATE', 'CANCEL')),
    comments TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (instance_id) REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'in_app' CHECK(type IN ('email', 'in_app', 'sms')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL', 'IMPORTANT', 'URGENT', 'ANNOUNCEMENT')),
    sender_id TEXT,
    sender_name TEXT,
    sender_role TEXT,
    sender_department_name TEXT,
    sender_avatar_url TEXT,
    sender_signature TEXT,
    related_resource_type TEXT,
    related_resource_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 14. Audit Logs (Immutable Security Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT, -- JSON string
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 15. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_dept ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_submitter ON workflow_instances(submitted_by);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_curr_step ON workflow_instances(current_step_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
