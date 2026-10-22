/**
 * ============================================================================
 * MODULE: Database Connection & Migration Engine (database.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Provides a singleton SQLite database connection using `better-sqlite3`,
 * configures database pragmas (WAL journaling mode, foreign key enforcement),
 * executes the initial DDL schema (`schema.sql`), and handles incremental
 * schema auto-migrations.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Establishes and caches the singleton `better-sqlite3` database instance.
 * 2. Creates parent directories if missing (e.g. `./data/iudwas.db`).
 * 3. Sets `journal_mode = WAL` (Write-Ahead Logging) for high concurrency
 *    and non-blocking reads during write operations.
 * 4. Enables `foreign_keys = ON` to enforce relational integrity across all
 *    3NF tables.
 * 5. Reads and executes `schema.sql` to initialize all relational entities.
 * 6. Executes programmatic auto-migrations:
 *    - `users.avatar_url`: User profile photo storage.
 *    - `notifications.priority`: Urgency priority levels (NORMAL, IMPORTANT, URGENT, ANNOUNCEMENT).
 *    - `notifications.sender_*`: Sender identity fields (ID, name, role, department, avatar).
 *    - `notifications.sender_signature`: HMAC-SHA256 cryptographic verification seal.
 * 7. Exposes `closeDatabase()` for clean shutdown upon process termination.
 * ============================================================================
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

let dbInstance: Database.Database | null = null;

/**
 * Retrieves the singleton SQLite database instance, ensuring schema migration.
 * @returns {Database.Database} Active better-sqlite3 database connection.
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new Database(config.databasePath);
    
    // Performance and integrity pragmas
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    // Run base schema DDL
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
      
      // Auto-migrate avatar_url column if DB already existed
      try {
        const userCols = dbInstance.pragma('table_info(users)') as any[];
        if (!userCols.some((col: any) => col.name === 'avatar_url')) {
          dbInstance.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
        }
      } catch (migrationErr) {
        logger.debug('Avatar column migration skipped/completed.');
      }

      // Auto-migrate password reset token columns if DB already existed
      try {
        const userCols = dbInstance.pragma('table_info(users)') as any[];
        if (!userCols.some((col: any) => col.name === 'reset_token_hash')) {
          dbInstance.exec('ALTER TABLE users ADD COLUMN reset_token_hash TEXT;');
          dbInstance.exec('ALTER TABLE users ADD COLUMN reset_token_expires INTEGER;');
        }
      } catch (migrationErr) {
        logger.debug('Reset token columns migration skipped/completed.');
      }

      // Auto-migrate notifications sender & signature columns if DB already existed
      try {
        const notifCols = dbInstance.pragma('table_info(notifications)') as any[];
        const colNames = notifCols.map((col: any) => col.name);
        if (!colNames.includes('priority')) {
          dbInstance.exec("ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'NORMAL';");
        }
        if (!colNames.includes('sender_id')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_id TEXT;');
        }
        if (!colNames.includes('sender_name')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_name TEXT;');
        }
        if (!colNames.includes('sender_role')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_role TEXT;');
        }
        if (!colNames.includes('sender_department_name')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_department_name TEXT;');
        }
        if (!colNames.includes('sender_avatar_url')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_avatar_url TEXT;');
        }
        if (!colNames.includes('sender_signature')) {
          dbInstance.exec('ALTER TABLE notifications ADD COLUMN sender_signature TEXT;');
        }
      } catch (notifMigrateErr) {
        logger.debug('Notification columns migration skipped/completed.');
      }

      logger.info('Database initialized successfully with schema.');
    }
  }

  return dbInstance;
}

/**
 * Closes the active database connection and resets the singleton instance.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed.');
  }
}
