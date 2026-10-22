/**
 * ============================================================================
 * MODULE: Secure Multipart File Upload & Magic-Byte Scanner (upload.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Handles multipart file uploads (documents, versions, and profile avatars),
 * enforces file size quotas, sanitizes storage filenames with UUIDs to prevent
 * path traversal attacks, and inspects real binary headers (magic bytes) to
 * detect spoofed extensions, polyglots, script embeddings, and executables.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Multer Storage Engine:
 *    - Saves uploaded files to isolated storage (`uploads/` or `uploads/avatars/`).
 *    - Generates cryptographically unique UUID filenames.
 * 2. Extension Filtering:
 *    - Strictly blocks all executable and script extensions (.exe, .sh, .php,
 *      .py, .svg, .html, .js, .env, etc.).
 *    - Whitelists safe document formats (.pdf, .docx, .doc, .xlsx, .xls, .png, .jpg, .tiff, .txt).
 * 3. Deep Magic-Byte Verification (`validateFileContent`):
 *    - Reads initial 1KB binary header of the uploaded file.
 *    - Checks for ELF, Windows PE/MZ, macOS Mach-O, Shebang (#!), and embedded PHP/HTML tags.
 *    - Validates matching magic bytes for PDF (%PDF-), PNG (89 50 4E 47),
 *      JPEG (FF D8 FF), Office ZIP containers (PK..), and TIFF.
 * 4. Automatic Remediation:
 *    - If magic bytes fail verification, immediately unlinks the file from disk
 *      and returns 400 Bad Request.
 * 5. Avatar Upload Pipeline:
 *    - Dedicated lightweight pipeline for user profile photos (up to 5MB, JPG/PNG/WEBP).
 * ============================================================================
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

// Ensure upload folder exists in isolated storage
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Strictly disallowed executable and script extensions
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.py', '.pl', '.cgi', '.rb', '.js', '.mjs', '.cjs', '.ts', '.html', '.htm', '.xhtml',
  '.svg', '.vbs', '.scr', '.msi', '.dll', '.so', '.dylib', '.jar', '.war', '.apk',
  '.bin', '.com', '.asp', '.aspx', '.jsp', '.jspx', '.htaccess', '.config', '.env'
]);

// Allowed safe document extensions
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.tiff', '.txt'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random UUID filename to prevent path traversal and execution
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const uniqueKey = `${uuidv4()}${cleanExt}`;
    cb(null, uniqueKey);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error(`Executable or script file type rejected: ${ext}`));
    return;
  }

  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxUploadSizeBytes, // Configurable max upload size (default: 50MB)
    files: 1, // Single file upload per request
  },
  fileFilter,
});

/**
 * Validates real binary file content and magic byte signatures.
 * Protects against files with spoofed extensions (e.g., an executable renamed to .pdf).
 */
export function validateFileContent(filePath: string, originalName: string): { valid: boolean; reason?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: 'Uploaded file not found on disk' };
    }

    const ext = path.extname(originalName).toLowerCase();
    const buffer = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) {
      return { valid: false, reason: 'Uploaded file is empty (0 bytes)' };
    }

    const header = buffer.subarray(0, bytesRead);

    // 1. Detect Executable Signatures & Script Headers across all files
    // ELF Executable (Linux binary): 0x7F 0x45 0x4C 0x46 (0x7F 'ELF')
    if (header[0] === 0x7F && header[1] === 0x45 && header[2] === 0x4C && header[3] === 0x46) {
      return { valid: false, reason: 'Malicious binary executable detected (ELF header)' };
    }

    // Windows PE / DOS Executable: 'MZ' (0x4D 0x5A)
    if (header[0] === 0x4D && header[1] === 0x5A) {
      return { valid: false, reason: 'Malicious binary executable detected (DOS/PE MZ header)' };
    }

    // Mach-O Executable (macOS binary): 0xFE 0xED 0xFA 0xCE or 0xCF 0xFA 0xED 0xFE
    if (
      (header[0] === 0xFE && header[1] === 0xED && header[2] === 0xFA) ||
      (header[0] === 0xCF && header[1] === 0xFA && header[2] === 0xED)
    ) {
      return { valid: false, reason: 'Malicious binary executable detected (Mach-O header)' };
    }

    // Unix Shell Script Shebang: '#!' (0x23 0x21)
    if (header[0] === 0x23 && header[1] === 0x21) {
      return { valid: false, reason: 'Executable script detected (Shebang header)' };
    }

    const headerString = header.toString('utf-8').toLowerCase();

    // Embedded Script Tags / PHP Tags
    if (
      headerString.includes('<?php') ||
      headerString.includes('<?=') ||
      headerString.includes('<script') ||
      headerString.includes('<html')
    ) {
      return { valid: false, reason: 'Malicious embedded script or markup detected' };
    }

    // 2. Validate Type-Specific Signatures
    switch (ext) {
      case '.pdf': {
        // PDF Magic Bytes: '%PDF-' (0x25 0x50 0x44 0x46 0x2D)
        const isPdf = headerString.includes('%pdf-') || (
          header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46
        );
        if (!isPdf) {
          return { valid: false, reason: 'File content does not match standard PDF header signature (%PDF-)' };
        }
        break;
      }

      case '.png': {
        // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
        const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        if (!isPng) {
          return { valid: false, reason: 'File content does not match PNG image header signature' };
        }
        break;
      }

      case '.jpg':
      case '.jpeg': {
        // JPEG Magic Bytes: FF D8 FF
        const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
        if (!isJpeg) {
          return { valid: false, reason: 'File content does not match JPEG image header signature' };
        }
        break;
      }

      case '.docx':
      case '.xlsx': {
        // Office Open XML (ZIP format): PK (0x50 0x4B 0x03 0x04)
        const isZip = (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) ||
                      (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x05 && header[3] === 0x06);
        if (!isZip) {
          return { valid: false, reason: 'File content does not match standard Office Open XML container signature' };
        }
        break;
      }

      case '.doc':
      case '.xls': {
        // Compound File Binary (OLE2): D0 CF 11 E0 A1 B1 1A E1, or standard Office ZIP
        const isOle = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
        const isZip = header[0] === 0x50 && header[1] === 0x4B;
        if (!isOle && !isZip) {
          return { valid: false, reason: 'File content does not match legacy MS Office binary format signature' };
        }
        break;
      }

      case '.tiff': {
        // TIFF: 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
        const isTiff = (header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
                       (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A);
        if (!isTiff) {
          return { valid: false, reason: 'File content does not match TIFF image signature' };
        }
        break;
      }

      case '.txt': {
        // Plain text must not contain binary NULL bytes in the first chunk
        for (let i = 0; i < Math.min(bytesRead, 512); i++) {
          if (header[i] === 0x00) {
            return { valid: false, reason: 'Plain text document contains invalid binary null bytes' };
          }
        }
        break;
      }
    }

    return { valid: true };
  } catch (err: any) {
    logger.error('File content validation error:', err);
    return { valid: false, reason: 'Failed to inspect file content structure' };
  }
}

/**
 * Express Middleware to perform content magic-byte verification post-Multer upload.
 * If invalid, automatically unlinks the uploaded file and rejects with 400.
 */
export function validateUploadedFileMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    next();
    return;
  }

  const result = validateFileContent(req.file.path, req.file.originalname);
  if (!result.valid) {
    // Delete the invalid file immediately
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupErr) {
      logger.error('Failed to cleanup rejected upload:', cleanupErr);
    }

    sendError(res, 'INVALID_FILE_CONTENT', result.reason || 'Uploaded file content failed security verification.', 400);
    return;
  }

  next();
}

// ── Profile Photo / Avatar Upload Configuration ──────────────────────────────
const avatarDir = path.join(config.uploadDir, 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const ALLOWED_AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ALLOWED_AVATAR_EXTENSIONS.has(ext) ? ext : '.jpg';
    const uniqueKey = `avatar_${uuidv4()}${cleanExt}`;
    cb(null, uniqueKey);
  },
});

const avatarFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image format: ${ext}. Allowed: JPG, PNG, WEBP, GIF`));
  }
};

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile avatars
    files: 1,
  },
  fileFilter: avatarFileFilter,
});
