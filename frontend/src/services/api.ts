/**
 * ============================================================================
 * MODULE: Frontend Universal API Client Service (api.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Centralized, strongly-typed HTTP service connecting frontend components to the
 * `/api/v1` RESTful backend gateway. Encapsulates automatic JWT header attachment,
 * transparent 401 token refresh queueing, error classification, and resource namespaces.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `apiRequest<T>()`:
 *    - Automatically injects `Authorization: Bearer <token>` from localStorage.
 *    - Handles multipart FormData vs application/json headers seamlessly.
 *    - Intercepts 401 Token Expired errors and coordinates non-blocking token
 *      refresh subscriber queues before replaying original failed requests.
 * 2. API Domain Namespaces:
 *    - `api.auth`: Login, register, profile updates, avatar photo uploads, password resets.
 *    - `api.users`: Admin user list, creation, editing, password reset, deactivation.
 *    - `api.departments`: Department listing, CRUD, chair assignment.
 *    - `api.documents`: Document uploads, version control, soft deletes, sharing.
 *    - `api.workflows`: Workflow template definitions and step builders.
 *    - `api.workflowInstances`: Workflow execution, approvals, rejections, delegations.
 *    - `api.categories` & `api.tags`: Document classification taxonomies.
 *    - `api.notifications`: Real-time notices and digitally signed announcements.
 *    - `api.audit`: Compliance logs and IP telemetry.
 *    - `api.analytics`: Administrative KPI statistics and user workspace metrics.
 *    - `api.system`: Real-time health benchmarks and institutional settings.
 *    - `api.ai`: OCR extraction, document classifier, summarizer, semantic search, chat.
 * ============================================================================
 */

import { ApiResponse, User, Department, DocumentItem, DocumentVersion, DocCategory, Tag, WorkflowTemplate, WorkflowInstance, NotificationItem, AuditLogItem } from '../types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: any }> {
  const token = localStorage.getItem('iudwas_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    let response = await fetch(url, { ...options, headers });

    // Handle 401 & Token Refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem('iudwas_refresh_token');
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshJson: ApiResponse<{ accessToken: string; refreshToken: string }> = await refreshRes.json();
            if (refreshJson.success && refreshJson.data) {
              localStorage.setItem('iudwas_token', refreshJson.data.accessToken);
              localStorage.setItem('iudwas_refresh_token', refreshJson.data.refreshToken);
              isRefreshing = false;
              onRefreshed(refreshJson.data.accessToken);
            } else {
              isRefreshing = false;
              localStorage.removeItem('iudwas_token');
              localStorage.removeItem('iudwas_refresh_token');
              localStorage.removeItem('iudwas_user');
              window.location.href = '/login';
              throw new ApiError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
            }
          } catch (err) {
            isRefreshing = false;
            throw err;
          }
        }

        // Retry original request with new token (works for both the initiator & concurrent waiters)
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, { ...options, headers });
              const retryJson: ApiResponse<T> = await retryRes.json();
              if (!retryJson.success) {
                reject(new ApiError(retryJson.error?.message || 'Request failed', retryJson.error?.code, retryJson.error?.statusCode));
              } else {
                resolve({ data: retryJson.data as T, meta: retryJson.meta });
              }
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.success || !response.ok) {
      throw new ApiError(
        json.error?.message || 'An error occurred while communicating with server',
        json.error?.code || 'UNKNOWN_ERROR',
        json.error?.statusCode || response.status,
        json.error?.details
      );
    }

    return { data: json.data as T, meta: json.meta };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

// API Services
export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiRequest<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { email: string; password: string; full_name: string; role?: string; department_id?: string; employee_id?: string }) =>
      apiRequest<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => apiRequest<{ user: User }>('/auth/me'),
    logout: (refreshToken?: string) =>
      apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    forgotPassword: (email: string) =>
      apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (email: string, new_password: string) =>
      apiRequest('/auth/reset-password', {
        method: 'PUT',
        body: JSON.stringify({ email, new_password }),
      }),
    uploadAvatar: (formData: FormData) =>
      apiRequest<{ message: string; avatar_url: string; user: User }>('/auth/avatar', {
        method: 'POST',
        body: formData,
      }),
    deleteAvatar: () =>
      apiRequest<{ message: string; user: User }>('/auth/avatar', {
        method: 'DELETE',
      }),
    updateProfile: (data: { full_name?: string; email?: string }) =>
      apiRequest<{ message: string; user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    changePassword: (data: { current_password: string; new_password: string }) =>
      apiRequest<{ message: string }>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Users CRUD
  users: {
    list: (params: { page?: number; limit?: number; search?: string; role?: string; department_id?: string; status?: string; sortBy?: string; sortOrder?: string } = {}) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<User[]>(`/users?${q}`);
    },
    get: (id: string) => apiRequest<User>(`/users/${id}`),
    create: (data: any) =>
      apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiRequest<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    uploadAvatar: (userId: string, formData: FormData) =>
      apiRequest<{ message: string; avatar_url: string; user: User }>(`/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
      }),
    toggleStatus: (id: string) =>
      apiRequest<{ user_id: string; is_active: boolean; message: string }>(`/users/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    resetPassword: (id: string, new_password: string) =>
      apiRequest(`/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password }),
      }),
    delete: (id: string) =>
      apiRequest(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Departments CRUD
  departments: {
    list: () => apiRequest<Department[]>('/departments'),
    get: (id: string) => apiRequest<Department>(`/departments/${id}`),
    create: (data: any) =>
      apiRequest<Department>('/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiRequest<Department>(`/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(`/departments/${id}`, {
        method: 'DELETE',
      }),
  },

  // Documents CRUD & Versions
  documents: {
    list: (params: { page?: number; limit?: number; search?: string; category_id?: string; department_id?: string; status?: string; uploaded_by?: string; sortBy?: string; sortOrder?: string } = {}) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<DocumentItem[]>(`/documents?${q}`);
    },
    get: (id: string) => apiRequest<DocumentItem>(`/documents/${id}`),
    upload: (formData: FormData) =>
      apiRequest<DocumentItem>('/documents/upload', {
        method: 'POST',
        body: formData,
      }),
    update: (id: string, data: any) =>
      apiRequest<DocumentItem>(`/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    uploadVersion: (id: string, formData: FormData) =>
      apiRequest<DocumentItem>(`/documents/${id}/version`, {
        method: 'POST',
        body: formData,
      }),
    getVersions: (id: string) => apiRequest<DocumentVersion[]>(`/documents/${id}/versions`),
    delete: (id: string) =>
      apiRequest(`/documents/${id}`, {
        method: 'DELETE',
      }),
    share: (id: string, data: { user_ids?: string[]; department_id?: string; message?: string }) =>
      apiRequest(`/documents/${id}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Categories & Tags
  categories: {
    list: () => apiRequest<DocCategory[]>('/categories'),
    create: (data: any) => apiRequest<DocCategory>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiRequest<DocCategory>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => apiRequest<Tag[]>('/tags'),
    create: (data: any) => apiRequest<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiRequest<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiRequest(`/tags/${id}`, { method: 'DELETE' }),
  },

  // Workflows Templates & Instances
  workflows: {
    list: (department_id?: string) => apiRequest<WorkflowTemplate[]>(`/workflows${department_id ? `?department_id=${department_id}` : ''}`),
    get: (id: string) => apiRequest<WorkflowTemplate>(`/workflows/${id}`),
    create: (data: any) => apiRequest<WorkflowTemplate>('/workflows', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiRequest<WorkflowTemplate>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    duplicate: (id: string) => apiRequest<WorkflowTemplate>(`/workflows/${id}/duplicate`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/workflows/${id}`, { method: 'DELETE' }),
  },
  workflowInstances: {
    start: (data: { workflow_id: string; document_id: string; comments?: string }) =>
      apiRequest<WorkflowInstance>('/workflow-instances', { method: 'POST', body: JSON.stringify(data) }),
    list: (params: { page?: number; limit?: number; status?: string; workflow_id?: string; scope?: string } = {}) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<WorkflowInstance[]>(`/workflow-instances?${q}`);
    },
    getPending: () => apiRequest<WorkflowInstance[]>('/workflow-instances/pending'),
    get: (id: string) => apiRequest<WorkflowInstance>(`/workflow-instances/${id}`),
    approve: (id: string, comments?: string) =>
      apiRequest<WorkflowInstance>(`/workflow-instances/${id}/approve`, { method: 'POST', body: JSON.stringify({ comments }) }),
    reject: (id: string, comments: string) =>
      apiRequest<WorkflowInstance>(`/workflow-instances/${id}/reject`, { method: 'POST', body: JSON.stringify({ comments }) }),
    delegate: (id: string, delegate_user_id: string, comments?: string) =>
      apiRequest(`/workflow-instances/${id}/delegate`, { method: 'POST', body: JSON.stringify({ delegate_user_id, comments }) }),
  },

  // Notifications
  notifications: {
    list: (params: { page?: number; limit?: number; unread?: boolean } = {}) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<NotificationItem[]>(`/notifications?${q}`);
    },
    unreadCount: () => apiRequest<{ unread_count: number }>('/notifications/unread-count'),
    markRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiRequest('/notifications/mark-all-read', { method: 'PATCH' }),
    send: (data: {
      title: string;
      message: string;
      type?: 'in_app' | 'email' | 'sms';
      priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT' | 'ANNOUNCEMENT';
      target_type: 'ALL' | 'DEPARTMENT' | 'ROLE' | 'USER';
      target_department_id?: string | null;
      target_role?: string | null;
      target_user_id?: string | null;
      confirm_signature?: boolean;
    }) =>
      apiRequest<{
        message: string;
        recipients_count: number;
        signature: string;
        signed_by: string;
        role: string;
        department: string;
        timestamp: string;
      }>('/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Analytics
  analytics: {
    adminMetrics: () => apiRequest<any>('/analytics/admin'),
    userMetrics: () => apiRequest<any>('/analytics/user'),
  },

  // Audit Logs
  audit: {
    list: (params: { page?: number; limit?: number; action?: string; resource_type?: string; user_id?: string; search?: string } = {}) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<AuditLogItem[]>(`/audit?${q}`);
    },
    get: (id: string) => apiRequest<AuditLogItem>(`/audit/${id}`),
  },

  // System & Telemetry
  system: {
    health: () => apiRequest<any>('/system/health'),
    getSettings: () => apiRequest<{ settings: Record<string, string>; raw: any[] }>('/system/settings'),
    updateSettings: (settings: Record<string, string>) =>
      apiRequest('/system/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  },

  // AI & OCR
  ai: {
    ocr: (data: { document_id?: string; text_content?: string }) =>
      apiRequest<any>('/ai/ocr', { method: 'POST', body: JSON.stringify(data) }),
    classify: (data: { text: string; title?: string }) =>
      apiRequest<any>('/ai/classify', { method: 'POST', body: JSON.stringify(data) }),
    summarize: (data: { text?: string; document_id?: string }) =>
      apiRequest<any>('/ai/summarize', { method: 'POST', body: JSON.stringify(data) }),
    search: (q: string) => apiRequest<any[]>(`/ai/search?q=${encodeURIComponent(q)}`),
    chat: (data: { message: string; conversation_history?: any[]; document_context_id?: string }) =>
      apiRequest<any>('/ai/chatbot', { method: 'POST', body: JSON.stringify(data) }),
    extractFields: (data: { text?: string; document_id?: string }) =>
      apiRequest<any>('/ai/extract-fields', { method: 'POST', body: JSON.stringify(data) }),
  },
};
