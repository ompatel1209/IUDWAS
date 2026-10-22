/**
 * ============================================================================
 * MODULE: Frontend Root Application & Routing Architecture (App.tsx)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Top-level application component that establishes client-side routing,
 * JWT session authentication protection, role-based authorization gates,
 * and layout containment.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Public Authentication Routes:
 *    - `/login`: User credentials and quick one-click demo account switcher.
 *    - `/register`: Student/Faculty account creation with department selection.
 *    - `/forgot-password`: Email password recovery request.
 *    - `/reset-password`: Token-verified new password creation.
 * 2. Protected Workspace Routes (`<ProtectedRoute>`):
 *    - Wraps authenticated routes inside `<AppLayout />` (Navbar, Sidebar, Spotlight).
 *    - `/dashboard`: Role-adaptive metrics, pending approvals queue, quick actions.
 *    - `/documents`: Document vault, OCR visualizer, multi-version uploads, sharing.
 *    - `/workflows`: Multi-step approval state machine and timeline tracking.
 *    - `/ai-assistant`: OCR extraction, NLP categorization, text summarizer, chat.
 *    - `/notifications`: Real-time notices and digitally signed announcements.
 * 3. Protected Administration Routes (`<RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>`):
 *    - `/admin`: Institutional overview and infrastructure health telemetry.
 *    - `/admin/users`: User management, roles, deactivation, password reset.
 *    - `/admin/departments`: Department hierarchy and chair assignments.
 *    - `/admin/documents`: University-wide document management.
 *    - `/admin/categories-tags`: Taxonomies and color indicators.
 *    - `/admin/workflows`: Workflow template builder and SLA hours.
 *    - `/admin/audit`: Immutable compliance audit trails and IP logging.
 *    - `/admin/settings`: Global policy configurations (Super Admin only).
 * ============================================================================
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Public Authentication Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotPasswordPage';

// Workspace Pages
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';

// Administration Control Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminCategoriesTagsPage } from './pages/admin/AdminCategoriesTagsPage';
import { AdminWorkflowsPage } from './pages/admin/AdminWorkflowsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-bg-light dark:bg-apple-bg-dark">
        <LoadingSpinner message="Authenticating session..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Role Guard Component
const RoleGuard: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Verifying authorization permissions..." />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Workspace Routes inside Apple Glass Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Admin Management Routes */}
        <Route
          path="admin"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminUsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/departments"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminDepartmentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/documents"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminDocumentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/categories-tags"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminCategoriesTagsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/workflows"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminWorkflowsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'DEPT_ADMIN']}>
              <AdminAuditPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <AdminSettingsPage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
