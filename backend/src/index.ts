/**
 * ============================================================================
 * MODULE: Server Entry Point (index.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Core bootstrap script for the IUDWAS (Intelligent University Document &
 * Workflow Automation System) Node.js/Express backend service.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Initializes the SQLite 3NF relational database connection and runs
 *    automated schema migrations.
 * 2. Checks database state; if empty, automatically triggers initial seed data
 *    with roles (Super Admin, Dept Admin, Faculty, Student), mock departments,
 *    document categories, approval workflows, and audit trails.
 * 3. Mounts the Express application instance configured with security headers,
 *    CORS, multi-tiered rate limiters, and RESTful API routes.
 * 4. Listens on the configured HTTP port (default 3001).
 * 5. Handles OS process signals (SIGTERM, SIGINT) for graceful server shutdown
 *    and clean SQLite database closure.
 * ============================================================================
 */

import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { getDatabase, closeDatabase } from './db/database';
import { seedDatabase } from './db/seed';

// Ensure DB is initialized and schema migrated
const db = getDatabase();

// If no users exist in the database, automatically seed default institutional data
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  logger.info('Database empty, running initial seed...');
  seedDatabase();
}

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 IUDWAS Backend API is running on http://localhost:${config.port}`);
  logger.info(`📡 Health endpoint available at http://localhost:${config.port}/api/v1/system/health`);
});

// Graceful shutdown handlers for container and process managers
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});
