/**
 * ============================================================================
 * MODULE: Centralized API v1 Master Router (routes/index.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Top-level routing aggregator that mounts all domain-specific sub-routers onto
 * standard RESTful path endpoints under `/api/v1`.
 * 
 * ROUTING MAP:
 * - `/api/v1/auth`               -> User Authentication, JWT Tokens, Passwords, Avatars
 * - `/api/v1/users`              -> User Management (CRUD, Status, Password Resets)
 * - `/api/v1/departments`        -> Department Management & Hierarchy
 * - `/api/v1/documents`          -> Document Vault, Uploads, Versions, Sharing
 * - `/api/v1/categories`         -> Document Classification Categories
 * - `/api/v1/tags`               -> Metadata Taxonomy Tags
 * - `/api/v1/workflows`          -> Approval Workflow Templates & Step Definitions
 * - `/api/v1/workflow-instances` -> Active Approval Requests & Execution State Machine
 * - `/api/v1/notifications`      -> Notifications, Badges, Digitally Signed Broadcasts
 * - `/api/v1/audit`              -> Immutable Audit Trail & Access Logs
 * - `/api/v1/analytics`          -> Institutional Telemetry & User Dashboard KPIs
 * - `/api/v1/system`             -> System Health Telemetry & Global Settings
 * - `/api/v1/ai`                 -> AI OCR Extraction, Classifier, Summarizer, Chat
 * ============================================================================
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import departmentsRoutes from './departments.routes';
import documentsRoutes from './documents.routes';
import { categoriesRouter, tagsRouter } from './categories.routes';
import workflowsRoutes from './workflows.routes';
import workflowInstancesRoutes from './workflow-instances.routes';
import notificationsRoutes from './notifications.routes';
import auditRoutes from './audit.routes';
import analyticsRoutes from './analytics.routes';
import systemRoutes from './system.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/departments', departmentsRoutes);
router.use('/documents', documentsRoutes);
router.use('/categories', categoriesRouter);
router.use('/tags', tagsRouter);
router.use('/workflows', workflowsRoutes);
router.use('/workflow-instances', workflowInstancesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/audit', auditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/system', systemRoutes);
router.use('/ai', aiRoutes);

export default router;
