/**
 * ============================================================================
 * MODULE: Document Categories & Metadata Taxonomies Controller (categories.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Manages document classification categories (Course Exemption, Research Grant,
 * Grade Appeal, Syllabus, etc.), color badges, and searchable metadata tags.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `listCategories()`:
 *    - Lists all active and inactive categories with live document counts.
 * 2. `createCategory()`:
 *    - Validates category name/code uniqueness and assigns hex theme colors.
 * 3. `updateCategory()`:
 *    - Updates category labels, codes, colors, and active flags.
 * 4. `deleteCategory()`:
 *    - Safely removes unassigned categories or deactivates populated ones.
 * 5. `listTags()`, `createTag()`, `deleteTag()`:
 *    - Manages searchable tag taxonomy used for document categorization.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';

export class CategoriesController {
  static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const categories = db.prepare(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM documents WHERE category_id = c.category_id AND status != 'deleted') as document_count
        FROM doc_categories c
        ORDER BY c.name ASC
      `).all() as any[];

      sendSuccess(res, categories.map(c => ({ ...c, is_active: Boolean(c.is_active) })));
    } catch (err: any) {
      sendError(res, 'CATEGORIES_LIST_ERROR', err.message, 500);
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, color = '#007AFF' } = req.body;
      if (!name || !code) {
        sendError(res, 'VALIDATION_ERROR', 'Name and code are required', 400);
        return;
      }

      const db = getDatabase();
      const existing = db.prepare('SELECT category_id FROM doc_categories WHERE name = ? OR code = ?').get(name.trim(), code.toUpperCase().trim());
      if (existing) {
        sendError(res, 'DUPLICATE_CATEGORY', 'A category with this name or code already exists', 409);
        return;
      }

      const categoryId = uuidv4();
      db.prepare(`
        INSERT INTO doc_categories (category_id, name, code, color, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
      `).run(categoryId, name.trim(), code.toUpperCase().trim(), color);

      recordAuditLog(req.user?.userId || null, 'CATEGORY_CREATE', 'CATEGORY', categoryId, req.ip, req.headers['user-agent'] as string, { name, code });

      const created = db.prepare('SELECT * FROM doc_categories WHERE category_id = ?').get(categoryId);
      sendSuccess(res, created, undefined, 201);
    } catch (err: any) {
      sendError(res, 'CATEGORY_CREATE_ERROR', err.message, 500);
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code, color, is_active } = req.body;

      const db = getDatabase();
      const current = db.prepare('SELECT * FROM doc_categories WHERE category_id = ?').get(id) as any;
      if (!current) {
        sendError(res, 'CATEGORY_NOT_FOUND', 'Category not found', 404);
        return;
      }

      const newName = name !== undefined ? name.trim() : current.name;
      const newCode = code !== undefined ? code.toUpperCase().trim() : current.code;
      const newColor = color !== undefined ? color : current.color;
      const newActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

      db.prepare(`
        UPDATE doc_categories 
        SET name = ?, code = ?, color = ?, is_active = ?
        WHERE category_id = ?
      `).run(newName, newCode, newColor, newActive, id);

      recordAuditLog(req.user?.userId || null, 'CATEGORY_UPDATE', 'CATEGORY', id, req.ip, req.headers['user-agent'] as string, { changes: req.body });

      const updated = db.prepare('SELECT * FROM doc_categories WHERE category_id = ?').get(id);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'CATEGORY_UPDATE_ERROR', err.message, 500);
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const inUse = db.prepare('SELECT COUNT(*) as c FROM documents WHERE category_id = ?').get(id) as { c: number };
      if (inUse.c > 0) {
        db.prepare('UPDATE doc_categories SET is_active = 0 WHERE category_id = ?').run(id);
        sendSuccess(res, { message: 'Category is assigned to documents. It has been deactivated safely.' });
        return;
      }

      db.prepare('DELETE FROM doc_categories WHERE category_id = ?').run(id);
      recordAuditLog(req.user?.userId || null, 'CATEGORY_DELETE', 'CATEGORY', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'Category deleted successfully' });
    } catch (err: any) {
      sendError(res, 'CATEGORY_DELETE_ERROR', err.message, 500);
    }
  }
}

export class TagsController {
  static async listTags(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const tags = db.prepare(`
        SELECT t.*,
               (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.tag_id) as document_count
        FROM tags t
        ORDER BY t.name ASC
      `).all() as any[];

      sendSuccess(res, tags);
    } catch (err: any) {
      sendError(res, 'TAGS_LIST_ERROR', err.message, 500);
    }
  }

  static async createTag(req: Request, res: Response): Promise<void> {
    try {
      const { name, color = '#5856D6' } = req.body;
      if (!name) {
        sendError(res, 'VALIDATION_ERROR', 'Tag name is required', 400);
        return;
      }

      const db = getDatabase();
      const existing = db.prepare('SELECT tag_id FROM tags WHERE name = ?').get(name.trim());
      if (existing) {
        sendError(res, 'DUPLICATE_TAG', 'Tag with this name already exists', 409);
        return;
      }

      const tagId = uuidv4();
      db.prepare('INSERT INTO tags (tag_id, name, color, created_at) VALUES (?, ?, ?, datetime(\'now\'))').run(tagId, name.trim(), color);

      const created = db.prepare('SELECT * FROM tags WHERE tag_id = ?').get(tagId);
      sendSuccess(res, created, undefined, 201);
    } catch (err: any) {
      sendError(res, 'TAG_CREATE_ERROR', err.message, 500);
    }
  }

  static async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      const db = getDatabase();
      const current = db.prepare('SELECT * FROM tags WHERE tag_id = ?').get(id) as any;
      if (!current) {
        sendError(res, 'TAG_NOT_FOUND', 'Tag not found', 404);
        return;
      }

      const newName = name !== undefined ? name.trim() : current.name;
      const newColor = color !== undefined ? color : current.color;

      db.prepare('UPDATE tags SET name = ?, color = ? WHERE tag_id = ?').run(newName, newColor, id);

      const updated = db.prepare('SELECT * FROM tags WHERE tag_id = ?').get(id);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'TAG_UPDATE_ERROR', err.message, 500);
    }
  }

  static async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      db.prepare('DELETE FROM document_tags WHERE tag_id = ?').run(id);
      db.prepare('DELETE FROM tags WHERE tag_id = ?').run(id);

      sendSuccess(res, { message: 'Tag removed successfully' });
    } catch (err: any) {
      sendError(res, 'TAG_DELETE_ERROR', err.message, 500);
    }
  }
}
